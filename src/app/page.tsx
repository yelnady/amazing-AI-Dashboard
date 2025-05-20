"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    onDrop: (acceptedFiles) => {
      setFile(acceptedFiles[0]);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !prompt) {
      alert('Please select a file and enter a prompt');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("prompt", prompt);

    try {
      console.log('Sending request to /api/analyze...');
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header, let the browser set it with the correct boundary
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);

      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          console.log('Parsed data:', data);
          localStorage.setItem("visualizationData", JSON.stringify(data));
          router.push("/visualization");
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          alert('Error parsing server response');
        }
      } else {
        let errorMessage = `Error: ${response.status} ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error, use the raw text
          errorMessage = responseText || errorMessage;
        }
        alert(`Error: ${errorMessage}`);
        console.error("Error analyzing data:", errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Network error:", error);
      alert(`Network error: ${errorMessage}. Please check if the backend server is running.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                Joebot DataViz
              </span>
            </div>
            <div>
              <a
                href="#"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Accelerating</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                Data Visualization
              </span>
            </h1>
            <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
              Upload your data and describe what you want to see. Our AI will create the perfect visualization for you.
            </p>
          </div>

          {/* Upload Form */}
          <div className="bg-white shadow-xl rounded-2xl p-8 space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div
                {...getRootProps()}
                className={`p-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all duration-200
                  ${isDragActive ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-orange-500 hover:bg-orange-50"}
                  ${file ? "border-green-500 bg-green-50" : ""}`}
              >
                <input {...getInputProps()} />
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <svg
                      className={`w-12 h-12 ${file ? 'text-green-500' : 'text-gray-400'}`}
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  {file ? (
                    <p className="text-green-600 font-medium">Selected file: {file.name}</p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-gray-700 font-medium">
                        {isDragActive ? "Drop the file here" : "Upload a file"}
                      </p>
                      <p className="text-sm text-gray-500">
                        Drag & drop a CSV/Excel file, or click to select
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label
                  htmlFor="prompt"
                  className="block text-lg font-medium text-gray-900"
                >
                  What visualization would you like to create?
                </label>
                <textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200"
                  placeholder="e.g., Create a bar chart showing total ChargedUnitPrice grouped by RuleName"
                  rows={3}
                />
              </div>

              <button
                type="submit"
                disabled={!file || !prompt || loading}
                className={`w-full py-3 px-6 rounded-xl text-white text-lg font-medium transition-all duration-200
                  ${
                    !file || !prompt || loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transform hover:scale-[1.02]"
                  }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </div>
                ) : (
                  "Generate Visualization"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
