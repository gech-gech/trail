import React, { useState, useEffect } from 'react';

const ApiCall = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/items')
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((error) => console.log('Error:', error));
  }, []);
  
  

  return (
    <div>
      <h1>Response from Backend:</h1>
      <p>{data}</p>
    </div>
  );
};

export default ApiCall;
