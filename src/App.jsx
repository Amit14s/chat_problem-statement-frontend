
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/user-login/login";
import { ProtectedRoute, PublicRoute } from "./protected.jsx";
import HomePage from "./components/Homepage";
import UserDetail from "./components/UserDetail.jsx";
import Setting from "./pages/settingSection/Setting.jsx";
import Status from "./pages/StatusSection/Status.jsx";

import useUserStore from "./store/useUserStore.js";
import { disconnectSocket, initializeSocket } from "./services/chat.service.js";
import { useChatStore } from "./store/chatStore.js";

function App() {
  // IMPORTANT: select the actual user, not the entire Zustand store
  const user = useUserStore((state) => state.user);

  const setCurrentUser = useChatStore((state) => state.setCurrentUser);
  const initsocketListners = useChatStore((state) => state.initsocketListners);
  const cleanup = useChatStore((state) => state.cleanup);

  useEffect(() => {
    if (user?._id) {
      setCurrentUser(user);
      initializeSocket();
      initsocketListners();
    }

    return () => {
      cleanup();
      disconnectSocket();
    };
  }, [user?._id]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />

      <Router>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/user-login" element={<Login />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/user-Profile" element={<UserDetail />} />
            <Route path="/setting" element={<Setting />} />
            <Route path="/status" element={<Status />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
