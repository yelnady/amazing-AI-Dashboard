import { NextRequest, NextResponse } from "next/server";
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    console.log('Received request to /api/ask-question');
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const question = formData.get("question") as string;

    console.log('File name:', file?.name);
    console.log('Question:', question);

    if (!file || !question) {
      console.error('Missing file or question');
      return NextResponse.json(
        { error: "File and question are required" },
        { status: 400 }
      );
    }

    // Use the existing backend URL
    const isDev = process.env.NODE_ENV === 'development';
    const backendUrl = isDev ? 'http://127.0.0.1:8000' : '';
    const apiUrl = `${backendUrl}/ask-question`;
    
    console.log('Backend URL:', apiUrl);
    
    const fileBuffer = await file.arrayBuffer();
    const fileData = new Uint8Array(fileBuffer);
    
    // Create form data for axios
    const formDataForAxios = new FormData();
    formDataForAxios.append("file", new Blob([fileData], { type: file.type }), file.name);
    formDataForAxios.append("question", question);

    console.log('Sending request to backend...');
    let response;
    try {
      console.log('Making request to:', apiUrl);
      response = await axios.post(apiUrl, formDataForAxios, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: Infinity,
        withCredentials: false,
      });
    } catch (fetchError: any) {
      console.error('Fetch error details:', fetchError);
      throw new Error(`Failed to connect to backend: ${fetchError.message}`);
    }

    console.log('Backend response status:', response.status);
    console.log('Backend response:', response.data);

    if (response.status !== 200) {
      throw new Error(`Backend processing failed: ${JSON.stringify(response.data)}`);
    }

    return NextResponse.json({
      answer: response.data.answer,
      data: response.data.data
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error processing request:", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
