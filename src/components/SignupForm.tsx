import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, User, Smartphone, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SignupFormProps {
  onToggle: () => void;
  backgroundUrl?: string | null;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onToggle, backgroundUrl }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      toast.success('Account created successfully!');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Dynamic Background Image */}
      {backgroundUrl && (
        <motion.div 
          initial={{ scale: 1.1, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute inset-0 z-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
          <div className="absolute inset-0 bg-black/50" />
        </motion.div>
      )}

      {/* Fallback Background decoration */}
      {!backgroundUrl && (
        <>
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
        </>
      )}
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10 px-4 py-8"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl mb-6 bg-transparent border border-white/30"
          >
            <Smartphone className="h-10 w-10 text-white" strokeWidth={1.5} />
          </motion.div>
          <motion.h1 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-extrabold tracking-tight mb-2 text-white drop-shadow-md"
          >
            Mehedy Telecom
          </motion.h1>
          <motion.p 
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="font-medium text-slate-200 drop-shadow"
          >
            Create Admin Account
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-transparent border-white/30 shadow-none">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center text-white">Sign Up</CardTitle>
              <CardDescription className="text-center text-slate-300">
                Enter your details to create a new account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-200">Full Name</Label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors text-slate-300 group-focus-within:text-white" />
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="Mehedy Hasan" 
                      className="pl-10 h-12 bg-transparent border-white/30 text-white placeholder:text-slate-300 focus-visible:ring-white/50"
                      required 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors text-slate-300 group-focus-within:text-white" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="admin@mehedytelecom.com" 
                      className="pl-10 h-12 bg-transparent border-white/30 text-white placeholder:text-slate-300 focus-visible:ring-white/50"
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-200">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors text-slate-300 group-focus-within:text-white" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      className="pl-10 h-12 bg-transparent border-white/30 text-white placeholder:text-slate-300 focus-visible:ring-white/50"
                      required 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2 bg-transparent border-none">
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold transition-all bg-transparent hover:bg-white/10 text-white border border-white/30" 
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : (
                    <>
                      Create Account <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
                <p className="text-sm text-center mt-4 text-slate-300">
                  Already have an account?{' '}
                  <button 
                    type="button" 
                    onClick={onToggle}
                    className="font-semibold hover:underline transition-colors text-white hover:text-slate-200"
                  >
                    Sign In
                  </button>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};
