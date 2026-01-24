import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const { login } = useAuth();
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post(`${API_URL}/auth/forgot-password`, { email: forgotEmail });
      setForgotSubmitted(true);
    } catch (error) {
      // Show success anyway for security (don't reveal if email exists)
      setForgotSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const closeForgotDialog = () => {
    setForgotPasswordOpen(false);
    setForgotEmail('');
    setForgotSubmitted(false);
  };

  return (
    <div className="login-container" data-testid="login-page">
      {/* Left - Form Section */}
      <div className="login-form-section">
        <div className="max-w-md mx-auto w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <img 
              src="https://customer-assets.emergentagent.com/job_756d16a4-b299-4f97-8859-f036a0db1e8b/artifacts/3xynh5cc_tatva.jpg" 
              alt="Tatva Ayurved Logo"
              className="w-14 h-14 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold text-[#1A1C18] tracking-tight" style={{ fontFamily: 'Playfair Display' }}>
                Tatva Ayurved
              </h1>
              <p className="text-sm text-[#6B7280]">Ayurveda for Health & Happiness</p>
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

          <div className="w-full">
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
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-sm text-[#3A5A40] hover:text-[#344E41] underline"
                    data-testid="forgot-password-link"
                  >
                    Forgot Password?
                  </button>
                </div>
              </form>
          </div>
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
              Ayurveda for Health & Happiness
            </h3>
            <p className="text-white/80 text-lg max-w-md">
              Streamline your Ayurvedic hospital operations with Tatva Ayurved management system
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onOpenChange={closeForgotDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Reset Password</DialogTitle>
            <DialogDescription>
              {!forgotSubmitted 
                ? "Enter your email address and we'll send you a reset link."
                : ""
              }
            </DialogDescription>
          </DialogHeader>
          {!forgotSubmitted ? (
            <form onSubmit={handleForgotPassword} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="h-12 pl-10 rounded-xl"
                    data-testid="forgot-email-input"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 bg-[#3A5A40] hover:bg-[#344E41] text-white rounded-full"
                data-testid="forgot-submit-btn"
              >
                {isLoading ? <span className="spinner"></span> : 'Send Reset Link'}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#588157]/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-[#588157]" />
              </div>
              <div>
                <p className="font-medium text-[#1A1C18]">Check your email</p>
                <p className="text-sm text-[#6B7280] mt-1">
                  If an account exists with <strong>{forgotEmail}</strong>, we've sent password reset instructions.
                </p>
              </div>
              <p className="text-xs text-[#D4A373] bg-[#D4A373]/10 p-3 rounded-xl">
                Note: Reset link is logged to server console (MOCKED - no email service configured)
              </p>
              <Button
                onClick={closeForgotDialog}
                variant="outline"
                className="rounded-full"
                data-testid="back-to-login-btn"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
