import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { Loader2, Lock, Mail, User, Smartphone } from 'lucide-react';
import { motion } from 'framer-motion';

interface SignupFormProps {
  onToggle: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onToggle }) => {
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary rounded-2xl shadow-lg mb-4">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Mehedy Telecom</h1>
          <p className="text-slate-500">Create your account</p>
        </div>

        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl">Sign Up</CardTitle>
            <CardDescription>Enter your details to create an account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="Mehedy Hasan" 
                    className="pl-10"
                    required 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="mehedy@telecom.com" 
                    className="pl-10"
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    className="pl-10"
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-11 text-lg shadow-md" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Create Account'}
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={onToggle}
                  className="text-primary font-semibold hover:underline"
                >
                  Sign In
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
