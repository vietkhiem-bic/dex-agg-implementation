import { useState } from "react";
import { AuthSession } from "../types";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useLocalStorage } from "usehooks-ts";

import { BIC_APP_API_DEV_URL, getBicSigner } from "../utils";
import useNotification from "../hooks/useNotification";

const LoginForm = () => {
  const [email, setEmail] = useState("trithanh+2@evol.vn");
  const [password, setPassword] = useState("Ok@12345");
  const [walletPassword, setWalletPassword] = useState("Ok@12345");
  const [recoveryPhrase, setRecoveryPhrase] = useState(
    "alter grass hedgehog road wing bachelor"
  );
  const [session, setSession] = useLocalStorage<AuthSession | null>(
    "session",
    null
  );

  const { notify } = useNotification();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notify("Email and password are required", "error");
      return;
    }

    try {
      const res = await axios.post<{ data: AuthSession }>(
        `${BIC_APP_API_DEV_URL}/v1/auth/public/login`,
        {
          email,
          password,
          device: {
            device_id: "9247532c-0f7d-4c02-8282-4b5d00879e1d",
            device_name:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            application: "BIC_GROUP",
            platform: "WEB",
          },
        },
        {
          headers: { "x-version-id": "2.2.0" },
        }
      );

      setSession(res.data.data);
    } catch (error) {
      console.error(error);
      notify("Login error", "error");
    }
  };

  const handleLoginWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !walletPassword) {
      notify("Login and wallet password is required", "error");
      return;
    }

    try {
      const user = jwtDecode(session.access_token);
      const signer = await getBicSigner();

      signer.startSession(session.access_token);
      await signer.login({
        userId: user.sub || "",
        password: walletPassword,
      });
    } catch (error) {
      console.error(error);
      notify("Login wallet error", "error");
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !recoveryPhrase || !walletPassword) {
      notify("Recovery phrase, wallet password is required", "error");
      return;
    }

    try {
      const user = jwtDecode(session.access_token);
      const signer = await getBicSigner();
      signer.startSession(session.access_token);
      await signer.recovery({
        password: walletPassword,
        recoveryCode: recoveryPhrase,
        userId: user.sub || "",
      });
    } catch (error) {
      console.error(error);
      notify("Recovery error", "error");
    }
  };

  return (
    <div className="p-6 w-full max-w-md mx-auto border rounded-lg shadow-lg bg-white relative">
      <h2 className="text-xl font-bold mb-4 text-center text-gray-800">
        Login
      </h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-1">Email:</label>
          <input
            type="email"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Password:</label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Wallet Password:</label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={walletPassword}
            onChange={(e) => setWalletPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Recover phrase:</label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={recoveryPhrase}
            onChange={(e) => setRecoveryPhrase(e.target.value)}
            required
          />
        </div>
        <div>
          <button
            onClick={handleLogin}
            className="mb-4 w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 cursor-pointer"
          >
            Login
          </button>
          <button
            onClick={handleLoginWallet}
            className="mb-4 w-full p-3 bg-yellow-600 text-white rounded-lg transition duration-200 cursor-pointer"
          >
            Login Wallet
          </button>
          <button
            onClick={handleRecover}
            className="w-full p-3 bg-pink-600 text-white rounded-lg transition duration-200 cursor-pointer"
          >
            Recover
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;
