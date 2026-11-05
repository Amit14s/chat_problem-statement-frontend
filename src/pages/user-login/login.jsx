
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import useUserStore from "../../store/useUserStore";
import {
  loginWithPassword,
  registerWithPassword
} from "../../services/user.services";

export default function Login() {
  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = isRegister
        ? await registerWithPassword(username.trim(), email.trim(), password)
        : await loginWithPassword(email.trim(), password);

      const user =
        result?.data?.user ||
        result?.data?.data?.user ||
        result?.user ||
        result?.data?.data ||
        result?.data;

      if (
        result?.status !== "success" ||
        !user ||
        typeof user !== "object"
      ) {
        throw new Error(result?.message || "Authentication failed");
      }

      // Update the existing Zustand authentication store.
      setUser(user);

      toast.success(isRegister ? "Registration successful!" : "Login successful!");

      // Replace the login page with the homepage.
      window.location.replace("/");
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Authentication failed";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-600 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-center text-3xl font-bold text-gray-800">
          Messenger
        </h1>

        <p className="mb-6 text-center text-gray-500">
          {isRegister ? "Create your account" : "Welcome back"}
        </p>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            className={`rounded-md py-2 ${
              !isRegister ? "bg-blue-600 text-white" : ""
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
            className={`rounded-md py-2 ${
              isRegister ? "bg-blue-600 text-white" : ""
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <input
              className="w-full rounded-lg border p-3"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          <input
            className="w-full rounded-lg border p-3"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="w-full rounded-lg border p-3"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="rounded bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
