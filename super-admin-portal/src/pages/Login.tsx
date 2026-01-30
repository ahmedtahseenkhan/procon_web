import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminLogin } from '../services/api';
import { Eye, EyeOff } from 'lucide-react';
import rykenLogo from "../assets/ryken-logo.png";

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await superAdminLogin({ username, password });
            localStorage.setItem('superAdminToken', res.token);
            localStorage.setItem('superAdminName', res.username);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center font-sans">
            <div className="w-full max-w-[480px] p-8">
                {/* Logo Section */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <img src={rykenLogo} alt="Ryken Security" className="h-16 w-auto" />
                </div>

                <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10">
                    <h2 className="text-2xl font-bold mb-8 text-gray-900 text-center">Login to Super Admin</h2>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center justify-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-gray-700 bg-gray-50/50"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-gray-700 bg-gray-50/50 pr-10"
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#10B981] text-white font-semibold py-3.5 rounded-lg hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
