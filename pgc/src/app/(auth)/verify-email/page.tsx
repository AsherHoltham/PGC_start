"use client"
import { VerifyUserForm } from '../../../components/VerifyUserForm';
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { User } from '../../../../lib/user';

export default function VerificationPage() {
    console.log("Verification Page");

    const [token, setToken] = useState('');
    const [message, setMessage] = useState('');  
    const [email, setEmail] = useState('');
    const router = useRouter();

    useEffect(() => {
        const savedMessage = localStorage.getItem('verificationMessage');
        if (savedMessage) {
            setEmail(savedMessage);
            localStorage.removeItem('verificationMessage'); // Clean up after use
        }
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        console.log("Attempt to verify:", email);
        
        try{
            // Send a GET to query-database API endpoint
            const qParam = `field=${encodeURIComponent("_email")}&value=${encodeURIComponent(email)}&type=${encodeURIComponent("User")}`;

            const db_response = await fetch(`/api/get-db?${qParam}`, { method: 'GET', headers: { 'Content-Type': 'application/json', } })

            if (db_response.ok) {
                setMessage(message); // Success message from API
                console.log('Email Queried successfully');
            } else {
                console.error('Error:', message);
            }

            const userInstance = JSON.stringify(db_response);

            console.log(userInstance, ": from query");
    
            // Parse the JSON string back into an object
            const parsedResult = JSON.parse(userInstance);
    
            // Access the "_verificationCode" key
            const verificationCode = parsedResult["_verificationCode"];

            if(token !== verificationCode){
                alert("Incorrect authentication code, try again");
                return;
            }
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
            console.log("Updating user in DB to display verified");

            // Send a PUT to VERIFY-EMAIL API endpoint
            const verify_response = await fetch('/api/verify-email', { method: 'POST', headers: {
                'Content-Type': 'application/json', },
              body: email, // Convert the user object to JSON
            });
      
            const userData = await verify_response.json(); // Parse the JSON response
    
            if (verify_response.ok) {
              console.log('User verified successfully');
            } else {
              setMessage(message); // Error message from API
              console.error('Error:', message);
            }



            // Send a POST to JWT allocator API endpoint






        } catch (error) {
            console.error('Unexpected error:', error);
            setMessage('An unexpected error occurred. Please try again.');
        }
    }


    return(
        <div style={{ textAlign: "center" }}>
            <h1>Check Your Email and use the verification code to verify your account</h1>
            < VerifyUserForm
                token={token}
                setTokenAction={setToken}
                onSubmitAction={handleSubmit}
            />
        </div>
    );
}