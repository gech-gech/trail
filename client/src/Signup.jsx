import React, { useState } from "react";
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
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFileError("File size exceeds 5MB limit");
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setFileError("Only image files are allowed");
        return;
      }
      
      setFileError("");
      setFormData({ ...formData, photo: file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");
    
    try {
      const formDataToSend = new FormData();
      
      // Add all text fields
      for (const key in formData) {
        if (key !== 'photo') {
          formDataToSend.append(key, formData[key]);
        }
      }
      
      // Add the photo if it exists
      if (formData.photo) {
        formDataToSend.append('photo', formData.photo);
      }

      console.log("Sending form data:", {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        // Don't log password
        gender: formData.gender,
        age: formData.age,
        photo: formData.photo ? formData.photo.name : 'none'
      });

      const response = await fetch("http://localhost:5000/signup", {
        method: "POST",
        body: formDataToSend,
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server returned non-JSON response: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Signup failed');
      }

      setMessage("Signup successful! Redirecting... ✅");
      setTimeout(() => navigate("/home"), 1500);
    } catch (error) {
      console.error("Signup error:", error);
      setMessage(error.message || "An error occurred during signup");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Signup</h2>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <input type="text" name="name" placeholder="Full Name" onChange={handleChange} required />
        <input type="text" name="username" placeholder="Username" onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" onChange={handleChange} required />
        <select name="gender" onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <input type="number" name="age" placeholder="Age" onChange={handleChange} required />
        <div>
          <input type="file" name="photo" accept="image/*" onChange={handleFileChange} />
          {fileError && <p style={{ color: 'red' }}>{fileError}</p>}
        </div>
        <button type="submit" disabled={isLoading || fileError}>
          {isLoading ? "Registering..." : "Register"}
        </button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default Signup;
