import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GroupPage from './GroupPage';
import './styles/GroupPage.css';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/groups/:groupId" element={<GroupPage />} />
        {/* Add more routes as needed */}
      </Routes>
    </Router>
  );
};

export default App;