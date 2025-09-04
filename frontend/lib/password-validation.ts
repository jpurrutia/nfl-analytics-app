/**
 * Password validation utility with comprehensive security rules
 */

// Common weak passwords list
const COMMON_WEAK_PASSWORDS = [
  'password', 'password123', '123456', '12345678', '123456789', 
  'qwerty', 'qwertyuiop', 'abc123', 'monkey', 'dragon',
  '1234567890', 'letmein', 'admin', 'welcome', 'monkey123',
  'password1', 'password12', 'password123', 'password1234',
  'qwerty123', 'abc123456', 'football', 'baseball', 'iloveyou',
  'trustno1', '1234567', 'sunshine', 'master', '123123',
  'welcome123', 'shadow', 'ashley', 'football1', 'jesus',
  'michael', 'ninja', 'mustang', 'password1', 'password12'
];

// Special characters set
const SPECIAL_CHARS = '!@#$%^&*()-_=+[]{};:\'",.<>?/|\\`~';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  score: number; // 0-100
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireDigit: boolean;
  requireSpecialChar: boolean;
  preventCommonPasswords: boolean;
  preventSequentialChars: boolean;
  preventRepeatedChars: boolean;
}

// Default requirements
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecialChar: true,
  preventCommonPasswords: true,
  preventSequentialChars: true,
  preventRepeatedChars: true,
};

/**
 * Check if password contains sequential characters
 */
function hasSequentialChars(password: string, maxSequence: number = 3): boolean {
  const lowerPassword = password.toLowerCase();
  
  // Check for keyboard sequences
  const keyboardPatterns = [
    'qwertyuiop',
    'asdfghjkl',
    'zxcvbnm',
    '1234567890',
    'abcdefghijklmnopqrstuvwxyz'
  ];
  
  for (const pattern of keyboardPatterns) {
    for (let i = 0; i <= pattern.length - maxSequence; i++) {
      const sequence = pattern.substring(i, i + maxSequence);
      const reverseSequence = sequence.split('').reverse().join('');
      
      if (lowerPassword.includes(sequence) || lowerPassword.includes(reverseSequence)) {
        return true;
      }
    }
  }
  
  // Check for numeric sequences
  for (let i = 0; i < password.length - maxSequence + 1; i++) {
    let isSequential = true;
    let isReverseSequential = true;
    
    for (let j = 0; j < maxSequence - 1; j++) {
      const current = password.charCodeAt(i + j);
      const next = password.charCodeAt(i + j + 1);
      
      if (next !== current + 1) {
        isSequential = false;
      }
      if (next !== current - 1) {
        isReverseSequential = false;
      }
    }
    
    if (isSequential || isReverseSequential) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if password contains repeated characters
 */
function hasRepeatedChars(password: string, maxRepeats: number = 3): boolean {
  let consecutiveCount = 1;
  
  for (let i = 1; i < password.length; i++) {
    if (password[i] === password[i - 1]) {
      consecutiveCount++;
      if (consecutiveCount >= maxRepeats) {
        return true;
      }
    } else {
      consecutiveCount = 1;
    }
  }
  
  return false;
}

/**
 * Calculate password entropy (bits)
 */
function calculateEntropy(password: string): number {
  const charsets = {
    lowercase: 26,
    uppercase: 26,
    digits: 10,
    special: SPECIAL_CHARS.length,
    space: 1
  };
  
  let poolSize = 0;
  
  if (/[a-z]/.test(password)) poolSize += charsets.lowercase;
  if (/[A-Z]/.test(password)) poolSize += charsets.uppercase;
  if (/[0-9]/.test(password)) poolSize += charsets.digits;
  if (new RegExp(`[${SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)) {
    poolSize += charsets.special;
  }
  if (/\s/.test(password)) poolSize += charsets.space;
  
  const entropy = password.length * Math.log2(poolSize);
  return Math.round(entropy);
}

/**
 * Calculate password strength score
 */
function calculateStrengthScore(password: string, errors: string[]): number {
  let score = 0;
  
  // Base score from length
  score += Math.min(password.length * 4, 40);
  
  // Character diversity
  if (/[a-z]/.test(password)) score += 5;
  if (/[A-Z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (new RegExp(`[${SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)) {
    score += 15;
  }
  
  // Bonus for mixed characters
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = new RegExp(`[${SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password);
  
  const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (varietyCount >= 3) score += 10;
  if (varietyCount === 4) score += 10;
  
  // Entropy bonus
  const entropy = calculateEntropy(password);
  if (entropy > 60) score += 10;
  if (entropy > 80) score += 10;
  
  // Penalties
  if (hasSequentialChars(password)) score -= 15;
  if (hasRepeatedChars(password)) score -= 15;
  if (errors.length > 0) score -= errors.length * 10;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Get password strength level based on score
 */
function getStrengthLevel(score: number): 'weak' | 'medium' | 'strong' | 'very-strong' {
  if (score < 40) return 'weak';
  if (score < 60) return 'medium';
  if (score < 80) return 'strong';
  return 'very-strong';
}

/**
 * Main password validation function
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];
  
  // Check if password is provided
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      strength: 'weak',
      score: 0
    };
  }
  
  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters long`);
  }
  
  // Check for uppercase letter
  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter (A-Z)');
  }
  
  // Check for lowercase letter
  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter (a-z)');
  }
  
  // Check for digit
  if (requirements.requireDigit && !/[0-9]/.test(password)) {
    errors.push('Password must include at least one digit (0-9)');
  }
  
  // Check for special character
  const specialCharRegex = new RegExp(`[${SPECIAL_CHARS.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
  if (requirements.requireSpecialChar && !specialCharRegex.test(password)) {
    errors.push(`Password must include at least one special character (${SPECIAL_CHARS})`);
  }
  
  // Check for common weak passwords
  if (requirements.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_WEAK_PASSWORDS.includes(lowerPassword)) {
      errors.push('Password is too common. Please choose a more unique password');
    }
    
    // Check for variations of common passwords
    for (const weakPassword of COMMON_WEAK_PASSWORDS) {
      if (lowerPassword.includes(weakPassword) && lowerPassword.length < weakPassword.length + 4) {
        errors.push('Password contains a common weak password pattern');
        break;
      }
    }
  }
  
  // Check for sequential characters
  if (requirements.preventSequentialChars && hasSequentialChars(password)) {
    errors.push('Password should not contain sequential characters (e.g., "abc", "123")');
  }
  
  // Check for repeated characters
  if (requirements.preventRepeatedChars && hasRepeatedChars(password)) {
    errors.push('Password should not contain repeated characters (e.g., "aaa", "111")');
  }
  
  // Calculate strength score and level
  const score = calculateStrengthScore(password, errors);
  const strength = getStrengthLevel(score);
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  };
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(strength: string): string {
  switch (strength) {
    case 'weak':
      return '#ef4444'; // red
    case 'medium':
      return '#f59e0b'; // amber
    case 'strong':
      return '#10b981'; // emerald
    case 'very-strong':
      return '#059669'; // emerald-600
    default:
      return '#6b7280'; // gray
  }
}

/**
 * Get password requirements as readable text
 */
export function getPasswordRequirementsText(
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): string[] {
  const text: string[] = [];
  
  text.push(`At least ${requirements.minLength} characters`);
  
  if (requirements.requireUppercase) {
    text.push('At least one uppercase letter (A-Z)');
  }
  
  if (requirements.requireLowercase) {
    text.push('At least one lowercase letter (a-z)');
  }
  
  if (requirements.requireDigit) {
    text.push('At least one digit (0-9)');
  }
  
  if (requirements.requireSpecialChar) {
    text.push('At least one special character');
  }
  
  if (requirements.preventCommonPasswords) {
    text.push('No common weak passwords');
  }
  
  if (requirements.preventSequentialChars) {
    text.push('No sequential characters');
  }
  
  if (requirements.preventRepeatedChars) {
    text.push('No excessive repeated characters');
  }
  
  return text;
}

/**
 * Generate a strong random password
 */
export function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = SPECIAL_CHARS;
  
  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + digits + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}