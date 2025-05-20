import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';

export const runtime = 'nodejs'; // Changed from 'edge' to 'nodejs' for better compatibility

export async function POST(request: NextRequest) {
  // Set CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('Received request to /api/analyze');
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const prompt = formData.get("prompt") as string;

    console.log('File name:', file?.name);
    console.log('Prompt:', prompt);
    console.log('File type:', file?.type);
    console.log('File size:', file?.size);

    if (!file || !prompt) {
      console.error('Missing file or prompt');
      return new NextResponse(
        JSON.stringify({ error: "File and prompt are required" }),
        { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    const backendUrl = process.env.NODE_ENV === 'development' 
      ? 'http://127.0.0.1:8000' 
      : process.env.BACKEND_URL || '';
    
    const apiUrl = `${backendUrl}/analyze`;
    console.log('Backend URL:', apiUrl);
    
    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();
    
    // Create form data for the backend
    const formDataForBackend = new FormData();
    formDataForBackend.append("file", new Blob([fileBuffer], { type: file.type }), file.name);
    formDataForBackend.append("prompt", prompt);

    console.log('Sending request to backend...');
    
    const response = await axios.post(apiUrl, formDataForBackend, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 30000, // 30 seconds timeout
    });

    console.log('Backend response status:', response.status);
    
    // Return the response from the backend
    return new NextResponse(
      JSON.stringify(response.data),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
    
  } catch (error) {
    console.error('Error in API route:', error);
    
    let status = 500;
    let errorMessage = 'Internal server error';
    
    if (axios.isAxiosError(error)) {
      status = error.response?.status || 500;
      errorMessage = error.response?.data?.error || error.message;
      console.error('Axios error details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return new NextResponse(
      JSON.stringify({ error: errorMessage }),
      {
        status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}
