export type SubscriptionPlan = 'free' | 'premium' | 'enterprise'

export async function getCurrentSubscriptionPlan(): Promise<SubscriptionPlan> {
  try {
    const response = await fetch('/api/user/subscription')
    if (!response.ok) {
      console.error('Failed to fetch subscription plan:', await response.text())
      return 'free' // Default to free plan on error
    }
    
    const data = await response.json()
    console.log('Subscription plan response:', data)
    return data.subscriptionPlan || 'free'
  } catch (error) {
    console.error('Error fetching subscription plan:', error)
    return 'free' // Default to free plan on error
  }
} 