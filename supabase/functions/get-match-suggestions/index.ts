
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
    
    // Create a Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    // Get current user's profile
    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (currentProfileError || !currentProfile) {
      throw new Error('Current user profile not found')
    }

    // Get all other profiles
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .neq('user_id', user.id)

    if (profilesError) {
      throw new Error('Failed to fetch profiles')
    }

    // Get existing matches for current user
    const { data: existingMatches, error: matchesError } = await supabase
      .from('matches')
      .select('match_user1_id, match_user2_id')
      .or(`match_user1_id.eq.${user.id},match_user2_id.eq.${user.id}`)

    if (matchesError) {
      throw new Error('Failed to fetch existing matches')
    }

    // Get blocked users
    const { data: blockedUsers, error: blockedError } = await supabase
      .from('blocked_users')
      .select('blocked_id')
      .eq('blocker_id', user.id)

    if (blockedError) {
      throw new Error('Failed to fetch blocked users')
    }

    // Get users who blocked current user
    const { data: blockedByUsers, error: blockedByError } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .eq('blocked_id', user.id)

    if (blockedByError) {
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

    // Parse current user's interests
    const currentAcademicInterests = currentProfile.profile_academic_interests
      ? currentProfile.profile_academic_interests.split(',').map(i => i.trim().toLowerCase())
      : []
    
    const currentNonAcademicInterests = currentProfile.profile_non_academic_interests
      ? currentProfile.profile_non_academic_interests.split(',').map(i => i.trim().toLowerCase())
      : []

    // Calculate compatibility scores
    const suggestedProfiles: Profile[] = allProfiles
      ?.filter(profile => 
        !matchedUserIds.has(profile.user_id) &&
        !blockedUserIds.has(profile.user_id) &&
        !blockedByUserIds.has(profile.user_id)
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

        return {
          ...profile,
          compatibility_score: compatibilityScore
        }
      })
      .sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0)) || []

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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
