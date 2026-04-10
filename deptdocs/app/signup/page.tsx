"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Supabase client helper
import { createClient } from '@/utils/supabase/client';
import { Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
    // 1. Setup states for all fields in the design
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const supabase = createClient();

    // 2. Handle Logic
    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    // Storing additional metadata (names/phone) in Supabase
                    data: {
                        first_name: formData.firstName,
                        last_name: formData.lastName,
                        phone_number: formData.phone
                    },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                alert(error.message);
                setLoading(false);
            } else {
                alert("Please check your email to confirm your account!");
                router.push('/login');
            }
        } catch (err) {
            console.error("Signup error:", err);
            const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
            if (msg.includes("fetch")) {
                alert("Network Error: Failed to reach the Supabase server. Check your internet connection or disable ad-blockers for this site.");
            } else {
                alert(msg);
            }
            setLoading(false);
        }
    };

    // Helper to update state
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-white p-6">
            <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center text-black">

                {/* LEFT COLUMN: Illustration (Matches the design placement) */}
                <div className="hidden lg:flex items-center justify-center">
                    <div className="relative w-full h-[500px]">
                        <Image
                            src="/signup-illustration.png" // The blue phone/shield graphic
                            alt="Security Illustration"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                {/* RIGHT COLUMN: Signup Form */}
                <div className="w-full max-w-xl mx-auto lg:mx-0">
                    <div className="flex flex-col space-y-6">
                        {/* Logo Header */}
                        <div className="flex justify-end">
                            <Image src="/christ-logo.png" alt="Christ Logo" width={250} height={80} priority />
                        </div>

                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Sign up</h1>
                            <p className="text-gray-500 mt-2">Let's get you all set up so you can access your personal account.</p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-4">
                            {/* Name Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">First Name</label>
                                    <input name="firstName" required onChange={handleChange} placeholder="First Name" className="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#5065F6]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Last Name</label>
                                    <input name="lastName" required onChange={handleChange} placeholder="Last Name" className="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#5065F6]" />
                                </div>
                            </div>

                            {/* Contact Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Email</label>
                                    <input name="email" type="email" required onChange={handleChange} placeholder="Email" className="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#5065F6]" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Phone Number</label>
                                    <input name="phone" type="tel" required onChange={handleChange} placeholder="Phone Number" className="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#5065F6]" />
                                </div>
                            </div>

                            {/* Password Fields */}
                            <div className="space-y-1 relative">
                                <label className="text-sm font-medium">Password</label>
                                <input name="password" type={showPassword ? "text" : "password"} required onChange={handleChange} placeholder="Password" className="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#5065F6]" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="space-y-1 relative">
                                <label className="text-sm font-medium">Confirm Password</label>
                                <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required onChange={handleChange} placeholder="Confirm Password" className="w-full px-4 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-[#5065F6]" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-9 text-gray-400">
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            {/* Terms */}
                            <label className="flex items-center space-x-2 text-sm cursor-pointer">
                                <input type="checkbox" required className="rounded border-gray-300 text-[#5065F6]" />
                                <span>I agree to all the <span className="text-pink-500 font-medium">Terms</span> and <span className="text-pink-500 font-medium">Privacy Policies</span></span>
                            </label>

                            <button type="submit" disabled={loading} className="w-full bg-[#5065F6] text-white py-3 rounded-md font-semibold hover:bg-[#4054e5] transition-all">
                                {loading ? "Creating account..." : "Create account"}
                            </button>

                            <p className="text-center text-sm">
                                Already have an account? <Link href="/login" className="text-pink-500 font-bold hover:underline">Login</Link>
                            </p>
                        </form>

                        {/* Social Signup */}
                        <div className="relative my-2 text-center">
                            <span className="bg-white px-2 text-sm text-gray-400 relative z-10">Or Sign up with</span>
                            <div className="absolute top-1/2 left-0 w-full border-t border-gray-200"></div>
                        </div>

                        <button type="button" className="w-full flex items-center justify-center gap-3 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-all font-medium">
                            <Image src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width={18} height={18} />
                            Continue with Google
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
}