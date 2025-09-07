'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  RotateCcw, 
  Play, 
  Pause, 
  Clock, 
  Database,
  Globe,
  Activity,
  AlertTriangle,
  CheckCircle,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown
} from 'lucide-react'

interface GlobalTimerState {
  startTime: number
  duration: number
  isActive: boolean
  lastSwapTime: number | null
  serverTime: number
}

interface AdminStats {
  connectedClients: number
  totalResets: number
  lastReset: number | null
  uptime: number
  instanceId: string
  activeInstances: number
  redisAvailable: boolean
}

interface MonitoringConfig {
  pollingMode: 'conservative' | 'balanced' | 'aggressive' | 'ultra'
  webhookMode: boolean
  webhookUrl: string
  heliusApiKey: string
}

interface CostStats {
  mode: string
  currentInterval: number
  currentCost: number
  minCost: number
  maxCost: number
  range: string
  lastTrade: string | null
  consecutiveErrors: number
}

export default function AdminPage() {
  const [timerState, setTimerState] = useState<GlobalTimerState | null>(null)
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState({
    tokenAddress: '9VxExA1iRPbuLLdSJ2rB3nyBxsyLReT4aqzZBMaBaY1p',
    timerDuration: 10,
    pollingInterval: 3,
    isMonitoring: true
  })
  const [monitoringConfig, setMonitoringConfig] = useState<MonitoringConfig>({
    pollingMode: 'balanced',
    webhookMode: false,
    webhookUrl: '',
    heliusApiKey: ''
  })
  const [costStats, setCostStats] = useState<CostStats | null>(null)
  const [healthStatus, setHealthStatus] = useState<any>(null)

  // Fetch current timer state
  const fetchTimerState = async () => {
    try {
      const response = await fetch('/api/timer')
      const data = await response.json()
      if (data.success) {
        setTimerState(data.data)
      }
    } catch (error) {
      console.error('Error fetching timer state:', error)
    }
  }

  // Fetch admin statistics
  const fetchAdminStats = async () => {
    try {
      const response = await fetch('/api/admin/stats')
      const data = await response.json()
      if (data.success) {
        setAdminStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error)
    }
  }

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatus(data)
    } catch (error) {
      console.error('Error fetching health status:', error)
    }
  }

  // Update settings
  const updateSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const data = await response.json()
      if (data.success) {
        alert('Settings updated successfully!')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  // Manual timer reset
  const resetTimer = async () => {
    try {
      const response = await fetch('/api/timer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      })
      const data = await response.json()
      if (data.success) {
        await fetchTimerState()
        alert('Timer reset successfully!')
      }
    } catch (error) {
      console.error('Error resetting timer:', error)
    }
  }

  // Toggle monitoring
  const toggleMonitoring = async () => {
    try {
      const response = await fetch('/api/admin/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !settings.isMonitoring })
      })
      const data = await response.json()
      if (data.success) {
        setSettings(prev => ({ ...prev, isMonitoring: !prev.isMonitoring }))
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error)
    }
  }

  // Fetch monitoring cost stats
  const fetchCostStats = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/stats')
      const data = await response.json()
      if (data.success) {
        setCostStats(data.data)
      }
    } catch (error) {
      console.error('Error fetching cost stats:', error)
    }
  }

  // Update monitoring configuration
  const updateMonitoringConfig = async () => {
    try {
      const response = await fetch('/api/admin/monitoring/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monitoringConfig)
      })
      const data = await response.json()
      if (data.success) {
        alert('Monitoring configuration updated successfully!')
        await fetchCostStats()
      }
    } catch (error) {
      console.error('Error updating monitoring config:', error)
    }
  }

  // Set polling speed
  const setPollingSpeed = async (mode: 'conservative' | 'balanced' | 'aggressive' | 'ultra') => {
    try {
      const response = await fetch('/api/admin/monitoring/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      })
      const data = await response.json()
      if (data.success) {
        setMonitoringConfig(prev => ({ ...prev, pollingMode: mode }))
        await fetchCostStats()
        alert(`Polling speed set to ${mode} mode!`)
      }
    } catch (error) {
      console.error('Error setting polling speed:', error)
    }
  }

  useEffect(() => {
    fetchTimerState()
    fetchAdminStats()
    fetchHealthStatus()
    fetchCostStats()
    setIsLoading(false)

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      fetchTimerState()
      fetchAdminStats()
      fetchHealthStatus()
      fetchCostStats()
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getTimeLeft = () => {
    if (!timerState) return 0
    const elapsed = timerState.serverTime - timerState.startTime
    return Math.max(0, timerState.duration - elapsed)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin panel...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8" />
            Global Timer Admin Panel
          </h1>
          <p className="text-gray-300">Manage the global timer system and monitor blockchain activity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Timer Status */}
          <Card className="border-white/20 p-6 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Timer Status</h2>
            </div>
            
            {timerState && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Status:</span>
                  <Badge variant={timerState.isActive ? "default" : "destructive"}>
                    {timerState.isActive ? "Active" : "Expired"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Time Left:</span>
                  <span className="text-2xl font-mono text-green-400">
                    {formatDuration(getTimeLeft())}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Started:</span>
                  <span className="text-sm text-gray-400">
                    {formatTime(timerState.startTime)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Last Reset:</span>
                  <span className="text-sm text-gray-400">
                    {timerState.lastSwapTime ? formatTime(timerState.lastSwapTime) : 'Never'}
                  </span>
                </div>
                
                <Separator className="bg-white/10" />
                
                <div className="flex gap-2">
                  <Button onClick={resetTimer} className="flex-1" variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Timer
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* System Stats */}
          <Card className="border-white/20 p-6 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">System Statistics</h2>
            </div>
            
            {adminStats && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Connected Clients:</span>
                  <Badge variant="outline" className="text-green-400">
                    {adminStats.connectedClients}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Resets:</span>
                  <span className="text-white font-semibold">
                    {adminStats.totalResets}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Uptime:</span>
                  <span className="text-sm text-gray-400">
                    {formatDuration(adminStats.uptime)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Last Reset:</span>
                  <span className="text-sm text-gray-400">
                    {adminStats.lastReset ? formatTime(adminStats.lastReset) : 'Never'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Instance ID:</span>
                  <span className="text-sm text-gray-400">
                    {adminStats.instanceId}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Active Instances:</span>
                  <Badge variant="outline" className="text-blue-400">
                    {adminStats.activeInstances}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Redis Status:</span>
                  <Badge variant={adminStats.redisAvailable ? "default" : "destructive"}>
                    {adminStats.redisAvailable ? "Connected" : "In-Memory"}
                  </Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Configuration Settings */}
          <Card className="border-white/20 p-6 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">Configuration</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="tokenAddress" className="text-gray-300">Token Address to Monitor</Label>
                <Input
                  id="tokenAddress"
                  value={settings.tokenAddress}
                  onChange={(e) => setSettings(prev => ({ ...prev, tokenAddress: e.target.value }))}
                  className="mt-1 bg-black/20 border-white/20 text-white"
                  placeholder="Enter Solana token mint address"
                />
              </div>
              
              <div>
                <Label htmlFor="timerDuration" className="text-gray-300">Timer Duration (minutes)</Label>
                <Input
                  id="timerDuration"
                  type="number"
                  value={settings.timerDuration}
                  onChange={(e) => setSettings(prev => ({ ...prev, timerDuration: parseInt(e.target.value) }))}
                  className="mt-1 bg-black/20 border-white/20 text-white"
                  min="1"
                  max="60"
                />
              </div>
              
              <div>
                <Label htmlFor="pollingInterval" className="text-gray-300">Blockchain Polling Interval (seconds)</Label>
                <Input
                  id="pollingInterval"
                  type="number"
                  value={settings.pollingInterval}
                  onChange={(e) => setSettings(prev => ({ ...prev, pollingInterval: parseInt(e.target.value) }))}
                  className="mt-1 bg-black/20 border-white/20 text-white"
                  min="1"
                  max="30"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="monitoring" className="text-gray-300">Blockchain Monitoring</Label>
                <Switch
                  id="monitoring"
                  checked={settings.isMonitoring}
                  onCheckedChange={toggleMonitoring}
                />
              </div>
              
              <Button onClick={updateSettings} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Update Settings
              </Button>
            </div>
          </Card>

          {/* Monitoring Status */}
          <Card className="border-white/20 p-6 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Globe className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Monitoring Status</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Blockchain Monitoring:</span>
                <div className="flex items-center gap-2">
                  {settings.isMonitoring ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  )}
                  <Badge variant={settings.isMonitoring ? "default" : "destructive"}>
                    {settings.isMonitoring ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Current Token:</span>
                <code className="text-xs bg-black/40 px-2 py-1 rounded text-gray-300">
                  {settings.tokenAddress.slice(0, 8)}...{settings.tokenAddress.slice(-8)}
                </code>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Polling Frequency:</span>
                <span className="text-white">
                  Every {settings.pollingInterval}s
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Timer Duration:</span>
                <span className="text-white">
                  {settings.timerDuration} minutes
                </span>
              </div>
            </div>
          </Card>

          {/* Health Status */}
          <Card className="border-white/20 p-6 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-semibold text-white">System Health</h2>
            </div>
            
            {healthStatus && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Overall Status:</span>
                  <Badge variant={healthStatus.status === 'healthy' ? "default" : "destructive"}>
                    {healthStatus.status}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Timer Service:</span>
                  <Badge variant={healthStatus.services.timer.status === 'healthy' ? "default" : "destructive"}>
                    {healthStatus.services.timer.status}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Redis:</span>
                  <Badge variant={healthStatus.services.redis.status === 'healthy' ? "default" : "destructive"}>
                    {healthStatus.services.redis.status}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Solana RPC:</span>
                  <Badge variant={healthStatus.services.solana.status === 'healthy' ? "default" : "destructive"}>
                    {healthStatus.services.solana.status}
                  </Badge>
                </div>
                
                <Separator className="bg-white/10" />
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Environment:</span>
                  <span className="text-sm text-gray-400">
                    {healthStatus.environment.nodeEnv}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Instance ID:</span>
                  <span className="text-sm text-gray-400">
                    {healthStatus.instanceId}
                  </span>
                </div>
              </div>
            )}
          </Card>

          {/* Monitoring Configuration */}
          <Card className="border-white/20 p-6 bg-black/20 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-semibold text-white">Monitoring Configuration</h2>
            </div>
            
            <div className="space-y-4">
              {/* Polling Speed Modes */}
              <div>
                <Label className="text-gray-300 mb-2 block">Polling Speed Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { mode: 'conservative', label: 'Conservative', icon: TrendingDown, color: 'text-green-400' },
                    { mode: 'balanced', label: 'Balanced', icon: TrendingUp, color: 'text-blue-400' },
                    { mode: 'aggressive', label: 'Aggressive', icon: Zap, color: 'text-yellow-400' },
                    { mode: 'ultra', label: 'Ultra', icon: DollarSign, color: 'text-red-400' }
                  ].map(({ mode, label, icon: Icon, color }) => (
                    <Button
                      key={mode}
                      variant={monitoringConfig.pollingMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPollingSpeed(mode as any)}
                      className="flex items-center gap-2"
                    >
                      <Icon className={`w-4 h-4 ${color}`} />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Cost Information */}
              {costStats && (
                <div className="space-y-3">
                  <Separator className="bg-white/10" />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Current Mode:</span>
                    <Badge variant="outline" className="text-blue-400">
                      {costStats.mode}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Current Interval:</span>
                    <span className="text-white">
                      {costStats.currentInterval}s
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Current Cost:</span>
                    <span className="text-green-400 font-semibold">
                      {costStats.currentCost} credits/hour
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Cost Range:</span>
                    <span className="text-sm text-gray-400">
                      {costStats.minCost} - {costStats.maxCost} credits/hour
                    </span>
                  </div>
                  
                  {costStats.lastTrade && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Last Trade:</span>
                      <span className="text-sm text-gray-400">
                        {new Date(costStats.lastTrade).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                  
                  {costStats.consecutiveErrors > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Consecutive Errors:</span>
                      <Badge variant="destructive">
                        {costStats.consecutiveErrors}
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Webhook Configuration */}
              <Separator className="bg-white/10" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Webhook Mode</Label>
                  <Switch
                    checked={monitoringConfig.webhookMode}
                    onCheckedChange={(checked) => 
                      setMonitoringConfig(prev => ({ ...prev, webhookMode: checked }))
                    }
                  />
                </div>
                
                {monitoringConfig.webhookMode && (
                  <div>
                    <Label htmlFor="webhookUrl" className="text-gray-300">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={monitoringConfig.webhookUrl}
                      onChange={(e) => setMonitoringConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      className="mt-1 bg-black/20 border-white/20 text-white"
                      placeholder="https://yourdomain.com/api/webhook/helius"
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="heliusApiKey" className="text-gray-300">Helius API Key</Label>
                  <Input
                    id="heliusApiKey"
                    type="password"
                    value={monitoringConfig.heliusApiKey}
                    onChange={(e) => setMonitoringConfig(prev => ({ ...prev, heliusApiKey: e.target.value }))}
                    className="mt-1 bg-black/20 border-white/20 text-white"
                    placeholder="Your Helius API key"
                  />
                </div>
              </div>
              
              <Button onClick={updateMonitoringConfig} className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Update Monitoring Config
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}