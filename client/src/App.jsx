import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./Signup";
import Login from "./Login";
import Home from "./Home";
import GroupPage from "./GroupPage";
import Bingocard from "./Bingocard";

const App = () => {
  // Get user data from localStorage if available
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<Home />} />
        <Route path="/groups/:groupId" element={<GroupPage />} />
        <Route path="/simple" element={<Bingocard user={user} />} />
      </Routes>
    </Router>
  );
};

export default App;
