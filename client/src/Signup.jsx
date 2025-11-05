import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Signup.css";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    gender: "",
    age: "",
    photo: null,
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [backendUrl, setBackendUrl] = useState("");
  const navigate = useNavigate();

  // Get backend URL based on frontend URL
  useEffect(() => {
    const currentUrl = window.location.href;
    console.log("Frontend URL:", currentUrl);
    
    if (currentUrl.includes('github.dev') || currentUrl.includes('app.github.dev')) {
      // Extract the base URL and change port to 5000
      const url = new URL(currentUrl);
      const baseName = url.hostname.split('-5173')[0]; // Remove the -5173 part
      const backendUrl = `https://${baseName}-5000.app.github.dev`;
      setBackendUrl(backendUrl);
      console.log("Backend URL:", backendUrl);
    } else {
      setBackendUrl("http://localhost:5000");
    }
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size exceeds 5MB limit");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setFileError("Only image files are allowed");
        return;
      }
      
      setFileError("");
      setFormData({ ...formData, photo: file });
    }
  };

  const testBackendConnection = async () => {
    if (!backendUrl) {
      setMessage("⏳ Detecting backend URL...");
      return;
    }

    try {
      setMessage(`Testing connection to backend...\nURL: ${backendUrl}/api`);
      console.log("Testing URL:", `${backendUrl}/api`);
      
      const response = await fetch(`${backendUrl}/api`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMessage(`✅ SUCCESS! Backend is connected.\nMessage: ${data.message}`);
      
    } catch (error) {
      console.error("Connection test failed:", error);
      setMessage(`❌ FAILED to connect to backend.\n\nURL tried: ${backendUrl}/api\nError: ${error.message}\n\nPlease check:\n1. Backend CORS configuration\n2. Backend is running\n3. Port 5000 is public`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!backendUrl) {
      setMessage("⏳ Please wait, detecting backend URL...");
      return;
    }
    
    if (!formData.name || !formData.username || !formData.email || !formData.password) {
      setMessage("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    setMessage("");
    
    try {
      const formDataToSend = new FormData();
      
      formDataToSend.append('name', formData.name);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('gender', formData.gender);
      formDataToSend.append('age', formData.age);
      
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo);
      }

      const response = await fetch(`${backendUrl}/signup`, {
        method: "POST",
        body: formDataToSend,
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || `Signup failed: ${response.status}`);
      }

      setMessage("✅ Signup successful! Redirecting...");
      setTimeout(() => navigate("/home"), 1500);
      
    } catch (error) {
      console.error("Signup error:", error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        setMessage(`❌ Cannot connect to backend server.\n\nThis is likely a CORS issue. Please update your backend CORS configuration.`);
      } else {
        setMessage(`❌ ${error.message || "An error occurred during signup"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Signup</h2>
      
     
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <input 
          type="text" 
          name="name" 
          placeholder="Full Name" 
          value={formData.name}
          onChange={handleChange} 
          required 
        />
        <input 
          type="text" 
          name="username" 
          placeholder="Username" 
          value={formData.username}
          onChange={handleChange} 
          required 
        />
        <input 
          type="email" 
          name="email" 
          placeholder="Email" 
          value={formData.email}
          onChange={handleChange} 
          required 
        />
        <input 
          type="password" 
          name="password" 
          placeholder="Password" 
          value={formData.password}
          onChange={handleChange} 
          required 
        />
        <select name="gender" value={formData.gender} onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input 
          type="number" 
          name="age" 
          placeholder="Age" 
          value={formData.age}
          onChange={handleChange} 
          required 
        />
        <div>
          <input type="file" name="photo" accept="image/*" onChange={handleFileChange} />
          {fileError && <p style={{ color: 'red' }}>{fileError}</p>}
        </div>
        <button 
          type="submit" 
          disabled={isLoading || fileError}
          style={{
            background: isLoading ? '#ccc' : '#1890ff',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
      
      {message && (
        <pre style={{ 
          color: message.includes('✅') ? 'green' : 'red',
          fontWeight: 'bold',
          marginTop: '15px',
          whiteSpace: 'pre-wrap',
          background: message.includes('✅') ? '#f6ffed' : '#fff2f0',
          padding: '15px',
          borderRadius: '5px',
          border: `1px solid ${message.includes('✅') ? '#b7eb8f' : '#ffccc7'}`
        }}>
          {message}
        </pre>
      )}
    </div>
  );
};

export default Signup;