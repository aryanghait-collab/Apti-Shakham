import React, { useState } from 'react';

// Import logo
import companyLogo from '../assests/company_logo.png';

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

interface RegistrationFormProps {
  onRegister: (user: User) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegister }) => {
  const [formData, setFormData] = useState<User>({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.firstName && formData.lastName && formData.email) {
      setIsSubmitting(true);
      onRegister(formData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="card animate-scale-in" style={{ width: '100%', maxWidth: '480px' }}>
      {/* Card Header */}
      <div className="card-header" style={{ textAlign: 'center' }}>
        <div style={{
          width: '120px',
          margin: '0 auto 1rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <img src={companyLogo} alt="Shakham Inc" style={{ width: '100%', height: 'auto' }} />
        </div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Candidate Registration</h2>
        <p style={{ fontSize: '0.875rem', opacity: 0.8 }}>
          Enter your details to begin the assessment
        </p>
      </div>

      {/* Form Body */}
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">First Name</label>
              <input
                required
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="form-input"
                placeholder="John"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Last Name</label>
              <input
                required
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="form-input"
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              required
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="john.doe@company.com"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
          >
            {isSubmitting ? (
              <>
                <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }}></div>
                Processing...
              </>
            ) : (
              'Continue to Instructions'
            )}
          </button>
        </form>

        {/* Info Section */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--color-border-light)',
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--color-success)' }}></div>
            <span style={{ fontSize: '0.625rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Secure Session
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--color-accent)' }}></div>
            <span style={{ fontSize: '0.625rem', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Monitored
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
