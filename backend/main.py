from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import json
import logging
from typing import Dict
from openai import AzureOpenAI
from dotenv import load_dotenv
import numpy as np
import os
    
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# Configure CORS
# For development, allow all origins. In production, specify exact origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
    expose_headers=["*"],  # Expose all headers to the client
)

# Initialize Azure OpenAI client
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

def analyze_data_with_gpt(df: pd.DataFrame, prompt: str) -> Dict:
    try:
        # Convert DataFrame info to string
        logger.info(f"Processing DataFrame with shape: {df.shape}")
        logger.info(f"DataFrame columns: {df.columns.tolist()}")
        logger.info(f"DataFrame dtypes: {df.dtypes.to_dict()}")
        
        # Get basic info about the data
        df_info = f"""
        Data Shape: {df.shape}
        Columns: {', '.join(df.columns)}
        First 5 rows:
        {df.head().to_string()}
        
        Summary Statistics:
        {df.describe().to_string()}
        """
        
        # Step 1: Generate data processing code
        system_message_step1 = """You are a data analysis expert. Your task is to analyze the provided data and generate Python code to process the data for visualization.
        
        You will receive:
        1. Information about the dataset (columns, data types, sample data)
        2. The user's visualization request
        
        Your task is to generate Python code that:
        1. Processes the pandas DataFrame (df) to extract/aggregate the necessary data for visualization
        2. Returns a dictionary with the processed data in a format suitable for ECharts
        
        The code should be a complete Python function that takes a DataFrame and returns a dictionary.
        Include all necessary imports and processing steps.
        """

        user_message_step1 = f"""
        Data Information:
        {df_info}
        
        User's Visualization Request:
        {prompt}
        
        Please generate Python code that processes the data for visualization.
        The code should be a complete function that takes a pandas DataFrame and returns a dictionary with the processed data.
        
        Example output format:
        {{
            'x_data': [...],  # List of x-axis values
            'y_data': [...],  # List of y-axis values
            'series_name': '...',  # Name of the series
            'x_label': '...',     # Label for x-axis
            'y_label': '...',     # Label for y-axis
            'title': '...'        # Chart title
        }}
        
        Return ONLY the Python code, with no other text or explanation.
        The code should be wrapped in a function called 'process_data' that takes a pandas DataFrame as input.
        """
        
        # Call GPT to get data processing code
        logger.info("Generating data processing code...")
        response_step1 = client.chat.completions.create(
            model="gpt-4o",  # Must match the deployment name in Azure OpenAI
            messages=[
                {"role": "system", "content": system_message_step1},
                {"role": "user", "content": user_message_step1}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        # Extract the Python code from the response
        processing_code = response_step1.choices[0].message.content.strip()
        logger.info(f"Generated processing code:\n{processing_code}")
        
        # Extract just the function definition if there's extra text
        if 'def process_data' in processing_code:
            # Find the function definition and everything after it
            func_start = processing_code.index('def process_data')
            # Get everything from the function definition to the end
            processing_code = processing_code[func_start:]
            # Remove any trailing text after the function ends
            if '```' in processing_code:
                processing_code = processing_code.split('```')[0]
        
        # Create a namespace to execute the code in
        namespace = {'pd': pd, 'np': np, 'df': df.copy()}
        
        try:
            # Execute the processing code
            exec(processing_code, namespace)
            
            # Get the process_data function and execute it
            if 'process_data' in namespace:
                processed_data = namespace['process_data'](df)
                logger.info(f"Processed data: {processed_data}")
            else:
                raise ValueError("No 'process_data' function found in the generated code")
                
        except Exception as e:
            logger.error(f"Error executing processing code: {str(e)}")
            raise ValueError(f"Error in data processing code: {str(e)}")
        
        # Step 2: Generate ECharts configuration
        system_message_step2 = """You are a data visualization expert. Your task is to create an ECharts configuration based on the processed data.

        Your task is to generate a complete ECharts configuration that visualizes this data effectively. 
        The configuration should be a valid JSON object and use an orange-to-red gradient color scheme.
        """
        
        user_message_step2 = f"""
        Processed Data:
        {json.dumps(processed_data, indent=2)}
        
        Remember the user choice is: {prompt}
        
        Please generate an ECharts configuration that visualizes this data with the following requirements:
        1. Use an orange-to-red gradient color scheme (e.g., #f97316 to #ef4444)
        2. Choose an appropriate chart type (bar, line, pie, scatter, etc.) based on the data
        3. Include clear axis labels and a title
        4. Add tooltips for better data exploration
        5. Make sure the visualization is clean and professional
        
        For bar/line charts, use a gradient from orange to red for the series.
        For pie/donut charts, use varying shades of orange and red.
        
        You can create any type of chart the user asks for: box plot and so on
       
        Return ONLY the valid JSON configuration, with no other text or explanation.
        The response should be a valid JSON object that can be passed directly to ECharts.
        """
        
        logger.info("Sending request to Azure OpenAI")
        logger.info(f"Using model: gpt-4o")
        
        # Call the API to generate ECharts config
        logger.info("Generating ECharts configuration...")
        response_step2 = client.chat.completions.create(
            model="gpt-4o",  # Must match the deployment name in Azure OpenAI
            messages=[
                {"role": "system", "content": system_message_step2},
                {"role": "user", "content": user_message_step2}
            ],
            temperature=0.3,
            max_tokens=3000
        )
        
        # Extract the response content
        content = response_step2.choices[0].message.content.strip()
        logger.info(f"Raw ECharts config from Azure OpenAI: {content}")
        
        # Clean up the response to extract just the JSON
        try:
            # Try to find JSON in the response (in case there's extra text)
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > 0:
                content = content[json_start:json_end]
            
            # Parse the JSON to validate it
            result = json.loads(content)
            logger.info("Successfully parsed ECharts configuration")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse ECharts configuration: {e}")
            logger.error(f"Response content: {content}")
            raise HTTPException(
                status_code=500,
                detail=f"Error generating visualization: {str(e)}"
            )
    except Exception as e:
        logger.error(f"Error in analyze_data_with_gpt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_file(file: UploadFile, prompt: str = Form(...)):
    try:
        logger.info(f"Received file: {file.filename} with prompt: {prompt}")
        
        # Read the file into a pandas DataFrame
        try:
            if file.filename.endswith('.csv'):
                df = pd.read_csv(file.file)
            elif file.filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file.file)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
            
            logger.info(f"Successfully read file into DataFrame with shape: {df.shape}")
        except Exception as e:
            logger.error(f"Error reading file: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Error reading file: {str(e)}"})

        # Generate visualization options using GPT
        try:
            chart_options = analyze_data_with_gpt(df, prompt)
            logger.info("Successfully generated chart options")
            return JSONResponse(content=chart_options)
        except Exception as e:
            logger.error(f"Error generating visualization: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"error": f"Error generating visualization: {str(e)}"})
            
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Unexpected error: {str(e)}"})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Listen on all interfaces
        port=8000,
        reload=True,
        # Force IPv4 to avoid IPv6 issues
        loop="asyncio",
        interface="asgi3"
    )
