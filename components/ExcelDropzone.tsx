'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import ExcelImportService from '@/lib/services/excelImportService';

interface ExcelDropzoneProps {
  onFileProcessed: (data: any[]) => void;
  onError: (error: string) => void;
  acceptedFormats?: string[];
  maxSize?: number;
}

export default function ExcelDropzone({
  onFileProcessed,
  onError,
  acceptedFormats = ['.xlsx', '.xls'],
  maxSize = 5 * 1024 * 1024, // 5MB
}: ExcelDropzoneProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      onError('No valid files selected');
      return;
    }

    const file = acceptedFiles[0];
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const data = await ExcelImportService.parseExcelFile(file);
      onFileProcessed(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process file');
      setFileName(null);
    } finally {
      setIsProcessing(false);
    }
  }, [onFileProcessed, onError]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
    fileRejections,
  } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxSize,
    multiple: false,
  });

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${
            isDragActive && !isDragReject
              ? 'border-blue-400 bg-blue-50 text-blue-600'
              : isDragReject
              ? 'border-red-400 bg-red-50 text-red-600'
              : 'border-gray-300 bg-gray-50 text-gray-600 hover:border-gray-400 hover:bg-gray-100'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} disabled={isProcessing} />
        
        <div className="space-y-4">
          {isProcessing ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm font-medium">Processing {fileName}...</p>
            </div>
          ) : (
            <>
              <div className="mx-auto w-16 h-16 text-gray-400">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              
              {isDragActive ? (
                <p className="text-lg font-medium">
                  {isDragReject ? 'Invalid file type' : 'Drop the Excel file here'}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Drop Excel file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports .xlsx and .xls files (max {Math.round(maxSize / 1024 / 1024)}MB)
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <div className="mt-4">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="bg-red-50 border border-red-200 rounded p-3">
              <p className="font-medium text-red-800">{file.name}</p>
              <ul className="list-disc list-inside text-sm text-red-600 mt-1">
                {errors.map((error) => (
                  <li key={error.code}>{error.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Success Message */}
      {fileName && !isProcessing && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded p-3">
          <p className="text-green-800 font-medium">✅ File uploaded successfully: {fileName}</p>
        </div>
      )}
    </div>
  );
}