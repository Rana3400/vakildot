import React, { useState } from 'react';
import { registerNewClient } from '../firebase'; // Path check karein, agar firebase.js 'src' mein hai toh '../firebase' sahi hai

const AddClient = () => {
  const [formData, setFormData] = useState({
    clientName: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ye function aapke firebase.js se data bhejega
    const result = await registerNewClient(formData);

    if (result.success) {
      alert("Client saved successfully!");
      setFormData({ clientName: '', phone: '', email: '', address: '' }); // Form reset
    } else {
      alert("Error: " + result.error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', border: '1px solid #ccc', borderRadius: '8px', margin: '20px auto' }}>
      <h2>Add New Client</h2>
      <form onSubmit={handleSubmit}>
        <input name="clientName" placeholder="Name" value={formData.clientName} onChange={handleChange} required style={inputStyle} />
        <input name="phone" placeholder="Phone" value={formData.phone} onChange={handleChange} required style={inputStyle} />
        <input name="email" placeholder="Email" value={formData.email} onChange={handleChange} style={inputStyle} />
        <textarea name="address" placeholder="Address" value={formData.address} onChange={handleChange} style={inputStyle} />
        <button type="submit" style={buttonStyle}>Save to Firestore</button>
      </form>
    </div>
  );
};

const inputStyle = { display: 'block', width: '100%', marginBottom: '10px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' };
const buttonStyle = { width: '100%', padding: '10px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default AddClient;