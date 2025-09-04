'use client'

import { useState } from 'react'
import ModernLayout from '@/components/ModernLayout'
import { useRouter } from 'next/navigation'

interface UserPreferences {
  defaultScoringFormat: 'PPR' | 'STANDARD' | 'HALF_PPR'
  defaultWeek: number
  autoSaveDraft: boolean
  emailNotifications: boolean
  darkMode: boolean
  showProjectionSources: boolean
  confidenceThreshold: 'ALL' | 'MEDIUM' | 'HIGH'
}

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'preferences' | 'account' | 'leagues' | 'data'>('preferences')
  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultScoringFormat: 'PPR',
    defaultWeek: 1,
    autoSaveDraft: true,
    emailNotifications: false,
    darkMode: true,
    showProjectionSources: true,
    confidenceThreshold: 'ALL'
  })
  const [saved, setSaved] = useState(false)

  const handleSavePreferences = () => {
    // Save to localStorage for now (would save to backend in production)
    localStorage.setItem('userPreferences', JSON.stringify(preferences))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userPreferences')
    router.push('/login')
  }

  const TabButton = ({ id, label }: { id: string, label: string }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      style={{
        padding: '12px 24px',
        backgroundColor: activeTab === id ? '#3b82f6' : 'transparent',
        color: activeTab === id ? 'white' : '#9ca3af',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  )

  return (
    <ModernLayout>
      <div style={{ padding: '32px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            color: 'white', 
            marginBottom: '8px' 
          }}>
            Settings
          </h1>
          <p style={{ color: '#9ca3af' }}>
            Manage your account preferences and configuration
          </p>
        </div>

        {/* Tabs */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          marginBottom: '32px',
          borderBottom: '1px solid #374151',
          paddingBottom: '16px'
        }}>
          <TabButton id="preferences" label="Preferences" />
          <TabButton id="account" label="Account" />
          <TabButton id="leagues" label="Leagues" />
          <TabButton id="data" label="Data Sources" />
        </div>

        {/* Content */}
        <div style={{
          backgroundColor: '#1f2937',
          borderRadius: '12px',
          padding: '32px',
          minHeight: '500px'
        }}>
          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: 'white',
                marginBottom: '24px'
              }}>
                Application Preferences
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Default Scoring Format */}
                <div>
                  <label style={{ color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>
                    Default Scoring Format
                  </label>
                  <select
                    value={preferences.defaultScoringFormat}
                    onChange={(e) => setPreferences({ ...preferences, defaultScoringFormat: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: '#111827',
                      color: 'white',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="PPR">PPR (Point Per Reception)</option>
                    <option value="HALF_PPR">Half PPR</option>
                    <option value="STANDARD">Standard</option>
                  </select>
                </div>

                {/* Default Week */}
                <div>
                  <label style={{ color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>
                    Default Week View
                  </label>
                  <select
                    value={preferences.defaultWeek}
                    onChange={(e) => setPreferences({ ...preferences, defaultWeek: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: '#111827',
                      color: 'white',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    {[...Array(18)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                    ))}
                  </select>
                </div>

                {/* Confidence Threshold */}
                <div>
                  <label style={{ color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>
                    Minimum Projection Confidence
                  </label>
                  <select
                    value={preferences.confidenceThreshold}
                    onChange={(e) => setPreferences({ ...preferences, confidenceThreshold: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '10px 16px',
                      backgroundColor: '#111827',
                      color: 'white',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="ALL">Show All Projections</option>
                    <option value="MEDIUM">Medium Confidence or Higher</option>
                    <option value="HIGH">High Confidence Only</option>
                  </select>
                </div>

                {/* Toggle Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={preferences.autoSaveDraft}
                      onChange={(e) => setPreferences({ ...preferences, autoSaveDraft: e.target.checked })}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ color: '#e5e7eb' }}>Auto-save draft progress</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={preferences.showProjectionSources}
                      onChange={(e) => setPreferences({ ...preferences, showProjectionSources: e.target.checked })}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ color: '#e5e7eb' }}>Show individual projection sources</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={preferences.emailNotifications}
                      onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                      style={{ width: '20px', height: '20px' }}
                    />
                    <span style={{ color: '#e5e7eb' }}>Email notifications for updates</span>
                  </label>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSavePreferences}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    width: 'fit-content'
                  }}
                >
                  Save Preferences
                </button>

                {saved && (
                  <div style={{
                    padding: '12px',
                    backgroundColor: '#10b98120',
                    border: '1px solid #10b981',
                    borderRadius: '8px',
                    color: '#10b981'
                  }}>
                    Preferences saved successfully!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: 'white',
                marginBottom: '24px'
              }}>
                Account Management
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Account Info */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '16px' }}>Account Information</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ color: '#6b7280' }}>Email: </span>
                      <span style={{ color: 'white' }}>user@example.com</span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Member Since: </span>
                      <span style={{ color: 'white' }}>January 2025</span>
                    </div>
                    <div>
                      <span style={{ color: '#6b7280' }}>Account Type: </span>
                      <span style={{ color: '#10b981' }}>Premium</span>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '16px' }}>Change Password</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="password"
                      placeholder="Current Password"
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#1f2937',
                        color: 'white',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="password"
                      placeholder="New Password"
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#1f2937',
                        color: 'white',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    <input
                      type="password"
                      placeholder="Confirm New Password"
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#1f2937',
                        color: 'white',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        width: 'fit-content'
                      }}
                    >
                      Update Password
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px',
                  border: '1px solid #ef4444'
                }}>
                  <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Danger Zone</h3>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleLogout}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Sign Out
                    </button>
                    <button
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leagues Tab */}
          {activeTab === 'leagues' && (
            <div>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: 'white',
                marginBottom: '24px'
              }}>
                Connected Leagues
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ESPN Connection */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px',
                  border: '1px solid #374151'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ color: 'white', marginBottom: '8px' }}>ESPN Fantasy</h3>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Connect your ESPN league to import settings and rosters
                      </p>
                    </div>
                    <button
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Connect
                    </button>
                  </div>
                </div>

                {/* Yahoo Connection */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  opacity: 0.6
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ color: 'white', marginBottom: '8px' }}>Yahoo Fantasy</h3>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Coming soon - Yahoo integration in development
                      </p>
                    </div>
                    <button
                      disabled
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#374151',
                        color: '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'not-allowed'
                      }}
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>

                {/* Sleeper Connection */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px',
                  border: '1px solid #374151',
                  opacity: 0.6
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ color: 'white', marginBottom: '8px' }}>Sleeper</h3>
                      <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Coming soon - Sleeper integration in development
                      </p>
                    </div>
                    <button
                      disabled
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#374151',
                        color: '#6b7280',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'not-allowed'
                      }}
                    >
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Data Sources Tab */}
          {activeTab === 'data' && (
            <div>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: 'white',
                marginBottom: '24px'
              }}>
                Data Sources Configuration
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Current Sources */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '16px' }}>Active Data Sources</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#1f2937',
                      borderRadius: '6px'
                    }}>
                      <div>
                        <span style={{ color: 'white', fontWeight: '500' }}>BetOnline</span>
                        <span style={{ color: '#10b981', marginLeft: '12px', fontSize: '12px' }}>● Active</span>
                      </div>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Primary projections source</span>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#1f2937',
                      borderRadius: '6px'
                    }}>
                      <div>
                        <span style={{ color: 'white', fontWeight: '500' }}>Pinnacle</span>
                        <span style={{ color: '#10b981', marginLeft: '12px', fontSize: '12px' }}>● Active</span>
                      </div>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Props and implied probabilities</span>
                    </div>

                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: '#1f2937',
                      borderRadius: '6px'
                    }}>
                      <div>
                        <span style={{ color: 'white', fontWeight: '500' }}>nflverse</span>
                        <span style={{ color: '#f59e0b', marginLeft: '12px', fontSize: '12px' }}>● Test Mode</span>
                      </div>
                      <span style={{ color: '#6b7280', fontSize: '14px' }}>Historical stats and play-by-play</span>
                    </div>
                  </div>
                </div>

                {/* Update Schedule */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '16px' }}>Update Schedule</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Projections Update:</span>
                      <span style={{ color: 'white' }}>Tuesday 3:00 PM EST</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Live Scores:</span>
                      <span style={{ color: 'white' }}>Every 5 minutes (during games)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Historical Stats:</span>
                      <span style={{ color: 'white' }}>Daily at 2:00 AM EST</span>
                    </div>
                  </div>
                </div>

                {/* Data Quality */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#111827',
                  borderRadius: '8px'
                }}>
                  <h3 style={{ color: 'white', marginBottom: '16px' }}>Data Quality Status</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Last Update:</span>
                      <span style={{ color: 'white' }}>2025-09-04 15:30 EST</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Players with Projections:</span>
                      <span style={{ color: '#10b981' }}>406</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>High Confidence Projections:</span>
                      <span style={{ color: '#f59e0b' }}>187</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#9ca3af' }}>Data Pipeline Status:</span>
                      <span style={{ color: '#10b981' }}>Healthy</span>
                    </div>
                  </div>
                </div>

                {/* Note about test data */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f59e0b20',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px'
                }}>
                  <p style={{ color: '#f59e0b', fontSize: '14px' }}>
                    ⚠️ Currently using test data from parquet files. Production will connect to live BetOnline and Pinnacle APIs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModernLayout>
  )
}