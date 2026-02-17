import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SimpleCaptcha = ({ onVerify }) => {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');

  const generateCaptcha = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(result);
    setUserInput('');
    setIsVerified(false);
    setError('');
    onVerify(false);
  }, [onVerify]);

  useEffect(() => {
    generateCaptcha();
  }, [generateCaptcha]);

  const handleVerify = () => {
    if (userInput.toUpperCase() === captchaText) {
      setIsVerified(true);
      setError('');
      onVerify(true);
    } else {
      setError('Incorrect captcha. Please try again.');
      setIsVerified(false);
      onVerify(false);
      generateCaptcha();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value.toUpperCase();
    setUserInput(value);
    setError('');
    
    // Auto-verify when length matches
    if (value.length === 5 && value === captchaText) {
      setIsVerified(true);
      onVerify(true);
    } else if (value.length === 5 && value !== captchaText) {
      setError('Incorrect captcha');
      onVerify(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Captcha Display */}
        <div 
          className="flex-1 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center select-none"
          style={{
            fontFamily: 'monospace',
            fontSize: '24px',
            letterSpacing: '8px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            userSelect: 'none'
          }}
        >
          {captchaText.split('').map((char, i) => (
            <span 
              key={i} 
              style={{ 
                display: 'inline-block',
                transform: `rotate(${Math.random() * 20 - 10}deg)`,
                color: ['#333', '#555', '#666', '#444', '#777'][i % 5]
              }}
            >
              {char}
            </span>
          ))}
        </div>
        
        {/* Refresh Button */}
        <Button 
          type="button" 
          variant="outline" 
          size="icon" 
          onClick={generateCaptcha}
          className="h-12 w-12"
        >
          <RefreshCw className="h-5 w-5" />
        </Button>
      </div>

      {/* Input Field */}
      <div className="flex items-center gap-3">
        <Input
          type="text"
          placeholder="Enter captcha"
          value={userInput}
          onChange={handleInputChange}
          maxLength={5}
          className={`flex-1 text-center uppercase tracking-widest ${
            isVerified ? 'border-green-500 bg-green-50' : error ? 'border-red-500' : ''
          }`}
          disabled={isVerified}
        />
        {!isVerified && userInput.length === 5 && (
          <Button type="button" variant="outline" onClick={handleVerify}>
            Verify
          </Button>
        )}
      </div>

      {/* Status Messages */}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {isVerified && <p className="text-xs text-green-600">✓ Captcha verified</p>}
    </div>
  );
};

export default SimpleCaptcha;
