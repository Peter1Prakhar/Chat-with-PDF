"use client"
import * as React from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner';

// Define the expected structure of the API response from /upload/pdf
interface UploadApiResponse {
  message: string;
  filename: string;
}

const FileUploadComponent : React.FC = () => {
    const handleFileUploadButton = () => {
        const el = document.createElement('input')
        el.setAttribute('type', 'file')
        el.setAttribute('accept', 'application/pdf')
        el.addEventListener('change', async() => {
            if(el.files && el.files.length > 0){
                const file = el.files.item(0);
                if(file){
                    const formData = new FormData();
                    formData.append('pdf', file);
                    try {
                        const res = await fetch('http://localhost:8000/upload/pdf', {
                            method: 'POST',
                            body: formData,
                        });
                        if (!res.ok) {
                            throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        // Explicitly type the data coming from the API
                        const data = await res.json() as UploadApiResponse;
                        console.log('File upload response:', data);
                        toast.success(`File "${file.name}" uploaded successfully! Processing will begin shortly.`);
                    } catch (error) {
                        console.error('File upload failed:', error);
                        toast.error(`Failed to upload file "${file.name}". Please try again.`);
                    }
                }
            }
        });
        el.click();
    }
    return (
        <div className='bg-slate-900 text-white shadow-2xl flex justify-center items-center p-4 rounded-lg border-white border-2 cursor-pointer' onClick={handleFileUploadButton}>
            <div className='flex justify-center items-center flex-col'>
                <h3>Upload a PDF</h3>
                <Upload size={48}/>
            </div>
        </div>
    )
}
export default FileUploadComponent