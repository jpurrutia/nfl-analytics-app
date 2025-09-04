'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Check, X, Info } from 'lucide-react';
import { 
  validatePassword, 
  getPasswordStrengthColor,
  getPasswordRequirementsText,
  DEFAULT_PASSWORD_REQUIREMENTS,
  type PasswordValidationResult
} from '@/lib/password-validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  confirmPassword?: string;
  onPasswordChange: (password: string) => void;
  onConfirmPasswordChange?: (confirmPassword: string) => void;
  showRequirements?: boolean;
  showStrengthBar?: boolean;
  showToggleVisibility?: boolean;
  label?: string;
  confirmLabel?: string;
  placeholder?: string;
  confirmPlaceholder?: string;
}

export default function PasswordStrengthIndicator({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  showRequirements = true,
  showStrengthBar = true,
  showToggleVisibility = true,
  label = 'Password',
  confirmLabel = 'Confirm Password',
  placeholder = 'Enter a strong password',
  confirmPlaceholder = 'Confirm your password'
}: PasswordStrengthIndicatorProps) {
  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
  const requirements = getPasswordRequirementsText(DEFAULT_PASSWORD_REQUIREMENTS);
  
  useEffect(() => {
    if (password) {
      const result = validatePassword(password);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [password]);
  
  useEffect(() => {
    if (confirmPassword && password) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, confirmPassword]);
  
  const getRequirementStatus = (requirement: string): boolean => {
    if (!password) return false;
    
    if (requirement.includes('12 characters')) {
      return password.length >= 12;
    }
    if (requirement.includes('uppercase')) {
      return /[A-Z]/.test(password);
    }
    if (requirement.includes('lowercase')) {
      return /[a-z]/.test(password);
    }
    if (requirement.includes('digit')) {
      return /[0-9]/.test(password);
    }
    if (requirement.includes('special character')) {
      const specialChars = '!@#$%^&*()-_=+[]{};:\'",.<>?/|\\`~';
      return new RegExp(`[${specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password);
    }
    if (requirement.includes('common weak')) {
      return validation ? !validation.errors.some(e => e.includes('common')) : false;
    }
    if (requirement.includes('sequential')) {
      return validation ? !validation.errors.some(e => e.includes('sequential')) : false;
    }
    if (requirement.includes('repeated')) {
      return validation ? !validation.errors.some(e => e.includes('repeated')) : false;
    }
    
    return false;
  };
  
  return (
    <div style={{ width: '100%' }}>
      {/* Password Field */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '8px'
        }}>
          {label}
        </label>
        
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            style={{
              width: '100%',
              padding: '10px 40px 10px 12px',
              fontSize: '14px',
              border: `1px solid ${isFocused ? '#10b981' : '#e5e7eb'}`,
              borderRadius: '8px',
              outline: 'none',
              transition: 'all 0.2s',
              boxShadow: isFocused ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none'
            }}
          />
          
          {showToggleVisibility && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280'
              }}
            >
              {showPassword ? (
                <EyeOff style={{ width: '18px', height: '18px' }} />
              ) : (
                <Eye style={{ width: '18px', height: '18px' }} />
              )}
            </button>
          )}
        </div>
        
        {/* Strength Bar */}
        {showStrengthBar && password && validation && (
          <div style={{ marginTop: '8px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                Password strength:
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: getPasswordStrengthColor(validation.strength),
                textTransform: 'capitalize'
              }}>
                {validation.strength.replace('-', ' ')}
              </span>
            </div>
            
            <div style={{
              width: '100%',
              height: '4px',
              backgroundColor: '#e5e7eb',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${validation.score}%`,
                height: '100%',
                backgroundColor: getPasswordStrengthColor(validation.strength),
                transition: 'all 0.3s ease'
              }} />
            </div>
          </div>
        )}
        
        {/* Requirements List */}
        {showRequirements && (isFocused || password) && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '8px',
              fontSize: '12px',
              color: '#6b7280'
            }}>
              <Info style={{ width: '14px', height: '14px', marginRight: '6px' }} />
              Password Requirements
            </div>
            
            <div style={{ display: 'grid', gap: '4px' }}>
              {requirements.map((req, index) => {
                const isMet = getRequirementStatus(req);
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      fontSize: '12px',
                      color: isMet ? '#10b981' : '#6b7280',
                      transition: 'color 0.2s'
                    }}
                  >
                    {isMet ? (
                      <Check style={{ width: '14px', height: '14px', marginRight: '6px' }} />
                    ) : (
                      <X style={{ width: '14px', height: '14px', marginRight: '6px', opacity: 0.5 }} />
                    )}
                    <span style={{
                      textDecoration: isMet ? 'line-through' : 'none',
                      opacity: isMet ? 0.8 : 1
                    }}>
                      {req}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Confirm Password Field */}
      {onConfirmPasswordChange && (
        <div>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px'
          }}>
            {confirmLabel}
          </label>
          
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword || ''}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              onFocus={() => setIsConfirmFocused(true)}
              onBlur={() => setIsConfirmFocused(false)}
              placeholder={confirmPlaceholder}
              style={{
                width: '100%',
                padding: '10px 40px 10px 12px',
                fontSize: '14px',
                border: `1px solid ${
                  isConfirmFocused 
                    ? '#10b981' 
                    : confirmPassword && !passwordsMatch 
                      ? '#ef4444' 
                      : '#e5e7eb'
                }`,
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.2s',
                boxShadow: isConfirmFocused ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none'
              }}
            />
            
            {showToggleVisibility && (
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}
              >
                {showConfirmPassword ? (
                  <EyeOff style={{ width: '18px', height: '18px' }} />
                ) : (
                  <Eye style={{ width: '18px', height: '18px' }} />
                )}
              </button>
            )}
          </div>
          
          {confirmPassword && !passwordsMatch && (
            <p style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center'
            }}>
              <X style={{ width: '12px', height: '12px', marginRight: '4px' }} />
              Passwords do not match
            </p>
          )}
          
          {confirmPassword && passwordsMatch && password === confirmPassword && (
            <p style={{
              marginTop: '4px',
              fontSize: '12px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Check style={{ width: '12px', height: '12px', marginRight: '4px' }} />
              Passwords match
            </p>
          )}
        </div>
      )}
    </div>
  );
}