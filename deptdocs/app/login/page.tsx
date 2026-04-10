"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Supabase client helper for DeptDocs
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
    // 1. Setup states - Remembering user input and UI status
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // 2. Setup hooks - Tools for navigation and Supabase connection
    const router = useRouter();
    const supabase = createClient();

    // 3. Email/Password Login Logic
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert(error.message);
                setLoading(false);
            } else {
                router.push('/home');
                router.refresh();
            }
        } catch (err) {
            console.error("Login error:", err);
            const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
            if (msg.includes("fetch")) {
                alert("Network Error: Failed to reach the Supabase server. Check your connection.");
            } else {
                alert(msg);
            }
            setLoading(false);
        }
    };

    // 4. Google OAuth Login Logic
    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                alert(error.message);
            }
        } catch (err) {
            console.error("Google login error:", err);
            alert("An error occurred during Google login.");
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-white p-6">
            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-black">

                {/* LEFT COLUMN: Logo, Header, and Form */}
                <div className="w-full max-w-md mx-auto lg:mx-0">
                    <div className="flex flex-col space-y-8">

                        <div className="flex flex-col space-y-4">
                            <Image
                                src="/christ-logo.png"
                                alt="Christ University Logo"
                                width={250}
                                height={100}
                                priority
                            />
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Login</h1>
                                <p className="text-gray-500 mt-2 text-lg">Login to access your account</p>
                            </div>
                        </div>

                        <form onSubmit={handleLogin} className="flex flex-col space-y-5">
                            <div className="flex flex-col space-y-2">
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    placeholder="john.doe@gmail.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5065F6] focus:border-transparent outline-none transition-all text-black"
                                />
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label className="text-sm font-medium text-gray-700">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••••••••"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#5065F6] focus:border-transparent outline-none transition-all text-black"
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

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#5065F6] focus:ring-[#5065F6]" />
                                    <span className="text-gray-600">Remember me</span>
                                </label>
                                {/* Corrected Link without size prop */}
                                <Link
                                    href="/forgot-password"
                                    className="text-pink-500 hover:text-pink-600 font-medium transition-colors"
                                >
                                    Forgot Password
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-[#5065F6] hover:bg-[#4054e5] text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-70 flex justify-center items-center"
                            >
                                {loading ? "Logging in..." : "Login"}
                            </button>

                            <p className="text-center text-sm text-gray-600">
                                Don't have an account? <Link href="/signup" className="text-pink-500 font-bold hover:underline">Sign up</Link>
                            </p>
                        </form>

                        <div className="relative my-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300"></span>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-gray-500">Or login with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors font-medium text-gray-700"
                        >
                            <Image
                                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                                alt="Google"
                                width={20}
                                height={20}
                            />
                            Continue with Google
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Illustration */}
                <div className="hidden lg:flex items-center justify-center bg-gray-50/50 rounded-3xl p-12">
                    <div className="relative w-full h-[500px]">
                        <Image
                            src="/login-illustration.png"
                            alt="Security Illustration"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}