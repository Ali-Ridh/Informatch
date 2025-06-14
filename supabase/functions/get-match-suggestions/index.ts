
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

interface Profile {
  profile_id: number;
  user_id: string;
  profile_username: string;
  profile_bio: string;
  profile_birthdate: string;
  profile_academic_interests: string;
  profile_non_academic_interests: string;
  profile_looking_for: string;
  profile_avatar_url: string;
  profile_gender: string;
  profile_phone: string;
  user_priset_show_age: boolean;
  user_priset_show_bio: boolean;
  user_priset_is_private: boolean;
  compatibility_score?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    
    // Create a Supabase client with service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create a regular client for user operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the current user using the regular client
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Auth error:', userError)
      throw new Error('User not authenticated')
    }

    console.log('Authenticated user:', user.id)

    // Check if user exists in our users table, create if not
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist, create them
      console.log('Creating user record for:', user.id)
      const { error: createUserError } = await supabaseAdmin
        .from('users')
        .insert([{
          user_id: user.id,
          user_email: user.email || '',
          user_phone: user.phone || null,
          user_email_verified: user.email_confirmed_at !== null,
          user_phone_verified: user.phone_confirmed_at !== null
        }])

      if (createUserError) {
        console.error('Error creating user:', createUserError)
        throw new Error('Failed to create user record')
      }
    } else if (userCheckError) {
      console.error('Error checking user:', userCheckError)
      throw new Error('Failed to check user record')
    }

    // Get current user's profile
    const { data: currentProfile, error: currentProfileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (currentProfileError) {
      console.error('Current profile error:', currentProfileError)
      if (currentProfileError.code === 'PGRST116') {
        // Profile not found - user hasn't completed profile setup
        return new Response(
          JSON.stringify({ 
            suggestions: [],
            message: 'Please complete your profile setup first' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
      throw new Error('Current user profile not found')
    }

    console.log('Current profile found:', currentProfile.profile_id)

    // Get all other profiles with user privacy settings
    const { data: allProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select(`
        *,
        users!inner(
          user_priset_show_age,
          user_priset_show_bio,
          user_priset_is_private
        )
      `)
      .neq('user_id', user.id)

    if (profilesError) {
      console.error('Profiles error:', profilesError)
      throw new Error('Failed to fetch profiles')
    }

    console.log('Found profiles:', allProfiles?.length || 0)

    // Get existing matches for current user
    const { data: existingMatches, error: matchesError } = await supabaseAdmin
      .from('matches')
      .select('match_user1_id, match_user2_id')
      .or(`match_user1_id.eq.${user.id},match_user2_id.eq.${user.id}`)

    if (matchesError) {
      console.error('Matches error:', matchesError)
      throw new Error('Failed to fetch existing matches')
    }

    // Get blocked users
    const { data: blockedUsers, error: blockedError } = await supabaseAdmin
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', user.id)

    if (blockedError) {
      console.error('Blocked users error:', blockedError)
      throw new Error('Failed to fetch blocked users')
    }

    // Get users who blocked current user
    const { data: blockedByUsers, error: blockedByError } = await supabaseAdmin
      .from('blocked_users')
      .select('blocker_id')
      .eq('blocked_id', user.id)

    if (blockedByError) {
      console.error('Blocked by users error:', blockedByError)
      throw new Error('Failed to fetch users who blocked current user')
    }

    // Create sets for efficient filtering
    const matchedUserIds = new Set(
      existingMatches?.flatMap(match => [
        match.match_user1_id === user.id ? match.match_user2_id : match.match_user1_id
      ]) || []
    )

    const blockedUserIds = new Set(
      blockedUsers?.map(blocked => blocked.blocked_id) || []
    )

    const blockedByUserIds = new Set(
      blockedByUsers?.map(blocker => blocker.blocker_id) || []
    )

    console.log('Filtering criteria:', {
      matchedUsers: matchedUserIds.size,
      blockedUsers: blockedUserIds.size,
      blockedByUsers: blockedByUserIds.size
    })

    // Parse current user's interests
    const currentAcademicInterests = currentProfile.profile_academic_interests
      ? currentProfile.profile_academic_interests.split(',').map(i => i.trim().toLowerCase())
      : []
    
    const currentNonAcademicInterests = currentProfile.profile_non_academic_interests
      ? currentProfile.profile_non_academic_interests.split(',').map(i => i.trim().toLowerCase())
      : []

    // Calculate compatibility scores and flatten the user data
    const suggestedProfiles: Profile[] = allProfiles
      ?.filter(profile => 
        !matchedUserIds.has(profile.user_id) &&
        !blockedUserIds.has(profile.user_id) &&
        !blockedByUserIds.has(profile.user_id)
        // Note: We no longer filter out private profiles here since they should still be shown
        // The privacy setting affects matching behavior, not visibility
      )
      .map(profile => {
        const academicInterests = profile.profile_academic_interests
          ? profile.profile_academic_interests.split(',').map(i => i.trim().toLowerCase())
          : []
        
        const nonAcademicInterests = profile.profile_non_academic_interests
          ? profile.profile_non_academic_interests.split(',').map(i => i.trim().toLowerCase())
          : []

        // Calculate shared interests
        const sharedAcademic = currentAcademicInterests.filter(interest =>
          academicInterests.includes(interest)
        ).length

        const sharedNonAcademic = currentNonAcademicInterests.filter(interest =>
          nonAcademicInterests.includes(interest)
        ).length

        // Calculate compatibility score (academic interests weighted more heavily)
        const compatibilityScore = (sharedAcademic * 2) + sharedNonAcademic

        // Flatten the nested user data
        return {
          profile_id: profile.profile_id,
          user_id: profile.user_id,
          profile_username: profile.profile_username,
          profile_bio: profile.profile_bio,
          profile_birthdate: profile.profile_birthdate,
          profile_academic_interests: profile.profile_academic_interests,
          profile_non_academic_interests: profile.profile_non_academic_interests,
          profile_looking_for: profile.profile_looking_for,
          profile_avatar_url: profile.profile_avatar_url,
          profile_gender: profile.profile_gender,
          profile_phone: profile.profile_phone,
          user_priset_show_age: profile.users.user_priset_show_age,
          user_priset_show_bio: profile.users.user_priset_show_bio,
          user_priset_is_private: profile.users.user_priset_is_private,
          compatibility_score: compatibilityScore
        }
      })
      .sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0)) || []

    console.log('Final suggestions count:', suggestedProfiles.length)

    return new Response(
      JSON.stringify({ suggestions: suggestedProfiles }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in get-match-suggestions:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
