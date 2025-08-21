// supabase/functions/auto-checkout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get auto-checkout settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'auto_checkout')
      .single()

    if (settingsError || !settingsData) {
      console.log('No auto-checkout settings found')
      return new Response(JSON.stringify({ message: 'No settings found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const settings = JSON.parse(settingsData.value)
    
    if (!settings.enabled) {
      console.log('Auto-checkout disabled')
      return new Response(JSON.stringify({ message: 'Auto-checkout disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Check if auto-checkout should run
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const currentTime = now.toTimeString().slice(0, 5)
    
    const daySchedule = settings.schedule?.[currentDay]
    
    if (!daySchedule?.enabled) {
      console.log(`Auto-checkout not enabled for ${currentDay}`)
      return new Response(JSON.stringify({ message: `Not enabled for ${currentDay}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (currentTime < daySchedule.endTime) {
      console.log(`Too early: ${currentTime} < ${daySchedule.endTime}`)
      return new Response(JSON.stringify({ message: 'Too early for auto-checkout' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Get active volunteers
    const { data: activeVolunteers, error: volunteersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_checked_in', true)

    if (volunteersError) {
      throw volunteersError
    }

    const checkedOutUsers = []

    // Check out each volunteer
    for (const volunteer of activeVolunteers || []) {
      const checkInTime = new Date(volunteer.last_check_in)
      const checkOutTime = new Date()
      const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60)
      const roundedHours = Math.round(hoursWorked * 4) / 4

      // Create volunteer session
      await supabase
        .from('volunteer_sessions')
        .insert({
          user_id: volunteer.id,
          check_in_time: checkInTime.toISOString(),
          check_out_time: checkOutTime.toISOString(),
          hours_worked: roundedHours,
          notes: 'Auto-checkout: Office hours ended'
        })

      // Update user
      await supabase
        .from('users')
        .update({
          is_checked_in: false,
          last_check_in: null,
          total_hours: volunteer.total_hours + roundedHours
        })
        .eq('id', volunteer.id)

      checkedOutUsers.push(volunteer)
    }

    console.log(`Checked out ${checkedOutUsers.length} volunteers`)

    return new Response(
      JSON.stringify({ 
        message: `Auto-checked out ${checkedOutUsers.length} volunteers`,
        checkedOut: checkedOutUsers.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in auto-checkout:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})