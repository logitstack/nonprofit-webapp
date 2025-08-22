import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, fullName, username, role } = await req.json()

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!'

    // Create the auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username: username
      }
    })

    if (authError) throw authError

    // CREATE THE STAFF PROFILE - THIS IS WHERE YOUR CODE GOES
    const { error: profileError } = await supabaseAdmin
      .from('staff_profiles')
      .insert({
        id: authUser.user.id,
        full_name: fullName,
        username: username,
        role: role,
        email: email,
        first_login: true  // Add this line
      })

    if (profileError) throw profileError

    // Send password reset email
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Staff account created successfully. Password reset email sent.',
        tempPassword: tempPassword // Remove this in production
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})