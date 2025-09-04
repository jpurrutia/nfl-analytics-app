'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, User, Mail, Lock, ArrowRight, UserPlus } from 'lucide-react';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { validatePassword } from '@/lib/password-validation';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const onSubmit = async (data: RegisterFormData) => {
    // Validate password strength
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.errors[0]);
      return;
    }
    
    // Check passwords match
    if (data.password !== data.confirmPassword) {
      return;
    }
    
    try {
      setIsLoading(true);
      setPasswordError(null);
      await registerUser(data.firstName, data.lastName, data.email, data.password);
      router.push('/dashboard');
    } catch (error: any) {
      // Check if it's a password validation error from backend
      if (error?.response?.data?.error?.includes('password')) {
        setPasswordError(error.response.data.error);
      }
      // Other errors are handled in auth store
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '40px 32px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <UserPlus style={{ width: '48px', height: '48px', color: 'white' }} />
          </div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'white',
            marginBottom: '8px'
          }}>
            Join NFL Analytics
          </h2>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.9)'
          }}>
            Create your account and start winning
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ padding: '32px' }}>
          {/* Name Fields Row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            {/* First Name */}
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                First Name
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#9ca3af'
                }} />
                <input
                  {...register('firstName', {
                    required: 'First name is required',
                  })}
                  type="text"
                  style={{
                    width: '100%',
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    fontSize: '14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  placeholder="John"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {errors.firstName && (
                <p style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#ef4444'
                }}>{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Last Name
              </label>
              <div style={{ position: 'relative' }}>
                <User style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '18px',
                  height: '18px',
                  color: '#9ca3af'
                }} />
                <input
                  {...register('lastName', {
                    required: 'Last name is required',
                  })}
                  type="text"
                  style={{
                    width: '100%',
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    fontSize: '14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  placeholder="Doe"
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
              {errors.lastName && (
                <p style={{
                  marginTop: '4px',
                  fontSize: '12px',
                  color: '#ef4444'
                }}>{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '18px',
                height: '18px',
                color: '#9ca3af'
              }} />
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                })}
                type="email"
                autoComplete="email"
                style={{
                  width: '100%',
                  paddingLeft: '40px',
                  paddingRight: '12px',
                  paddingTop: '10px',
                  paddingBottom: '10px',
                  fontSize: '14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                placeholder="john.doe@example.com"
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.email && (
              <p style={{
                marginTop: '4px',
                fontSize: '12px',
                color: '#ef4444'
              }}>{errors.email.message}</p>
            )}
          </div>

          {/* Password Fields with Strength Indicator */}
          <div style={{ marginBottom: '24px' }}>
            <PasswordStrengthIndicator
              password={password || ''}
              confirmPassword={watch('confirmPassword') || ''}
              onPasswordChange={(value) => {
                setValue('password', value);
                setPasswordError(null);
              }}
              onConfirmPasswordChange={(value) => setValue('confirmPassword', value)}
              showRequirements={true}
              showStrengthBar={true}
              showToggleVisibility={true}
            />
            {passwordError && (
              <p style={{
                marginTop: '8px',
                fontSize: '12px',
                color: '#ef4444',
                padding: '8px',
                backgroundColor: '#fee2e2',
                borderRadius: '6px',
                border: '1px solid #fecaca'
              }}>
                {passwordError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)',
              transition: 'transform 0.2s',
              marginBottom: '24px'
            }}
            onMouseEnter={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => !isLoading && (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {isLoading ? 'Creating Account...' : (
              <>
                Create Account
                <ArrowRight style={{ width: '20px', height: '20px' }} />
              </>
            )}
          </button>

          {/* Login Link */}
          <div style={{
            textAlign: 'center',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Already have an account?{' '}
              <Link
                href="/login"
                style={{
                  color: '#10b981',
                  fontWeight: '600',
                  textDecoration: 'none'
                }}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}