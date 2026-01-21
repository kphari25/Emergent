import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Leaf, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('staff');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(email, password, name, role);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container" data-testid="login-page">
      {/* Left - Form Section */}
      <div className="login-form-section">
        <div className="max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-[#3A5A40] flex items-center justify-center">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1A1C18] tracking-tight" style={{ fontFamily: 'Playfair Display' }}>
                AyurCare Pro
              </h1>
              <p className="text-sm text-[#6B7280]">Hospital Management System</p>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#1A1C18] mb-2" style={{ fontFamily: 'Playfair Display' }}>
              Welcome
            </h2>
            <p className="text-[#6B7280]">
              Sign in to manage your Ayurvedic hospital efficiently
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#DAD7CD]/30">
              <TabsTrigger value="login" data-testid="login-tab">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-[#374151] font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-white border-[#E2E8F0] focus:border-[#3A5A40] rounded-xl"
                    data-testid="login-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-[#374151] font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 bg-white border-[#E2E8F0] focus:border-[#3A5A40] rounded-xl pr-12"
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#3A5A40]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#3A5A40] hover:bg-[#344E41] text-white rounded-full font-medium text-base btn-active"
                  data-testid="login-submit"
                >
                  {isLoading ? <span className="spinner"></span> : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="text-[#374151] font-medium">Full Name</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-12 bg-white border-[#E2E8F0] focus:border-[#3A5A40] rounded-xl"
                    data-testid="register-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="text-[#374151] font-medium">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 bg-white border-[#E2E8F0] focus:border-[#3A5A40] rounded-xl"
                    data-testid="register-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="text-[#374151] font-medium">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 bg-white border-[#E2E8F0] focus:border-[#3A5A40] rounded-xl"
                    data-testid="register-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-role" className="text-[#374151] font-medium">Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="h-12 bg-white border-[#E2E8F0] rounded-xl" data-testid="register-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-[#3A5A40] hover:bg-[#344E41] text-white rounded-full font-medium text-base btn-active"
                  data-testid="register-submit"
                >
                  {isLoading ? <span className="spinner"></span> : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right - Image Section */}
      <div className="login-image-section">
        <img
          src="https://images.unsplash.com/photo-1671493234884-b1611bcf3e69?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODd8MHwxfHNlYXJjaHw0fHxheXVydmVkaWMlMjBoZXJicyUyMG1lZGljaW5lJTIwYm90dGxlc3xlbnwwfHx8fDE3NjkwMzA1ODR8MA&ixlib=rb-4.1.0&q=85"
          alt="Ayurvedic medicines"
          className="object-cover"
        />
        <div className="login-image-overlay flex items-end p-12">
          <div className="text-white">
            <h3 className="text-3xl font-bold mb-3" style={{ fontFamily: 'Playfair Display' }}>
              Ancient Wisdom, Modern Care
            </h3>
            <p className="text-white/80 text-lg max-w-md">
              Streamline your Ayurvedic hospital operations with our comprehensive management system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
