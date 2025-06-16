// get-match-suggestions/index.ts (Supabase Edge Function)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0'; // Ensure this version is compatible
Deno.serve(async (req)=>{
  // Define CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://localhost:8080',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
    'Access-Control-Max-Age': '86400'
  };
  // Handle OPTIONS method (preflight request)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204
    });
  }
  // Set up a try-catch block for the entire function logic to catch any unexpected errors
  try {
    // Only allow POST method for actual function logic
    if (req.method !== 'POST') {
      console.warn("Method Not Allowed:", req.method); // Debug log
      return new Response(JSON.stringify({
        error: 'Method Not Allowed'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 405
      });
    }
    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: {
        headers: {
          'Authorization': authHeader ?? ''
        }
      }
    });
    let current_user_id = null;
    try {
      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        console.error('Auth error in Edge Function:', userError?.message || 'User not found in auth context');
        return new Response(JSON.stringify({
          error: 'User not authenticated or session invalid.'
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 401
        });
      }
      current_user_id = user.id;
    } catch (error) {
      console.error('Unexpected error during authentication check in Edge Function:', error.message);
      return new Response(JSON.stringify({
        error: 'Internal server error during authentication check: ' + error.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    if (!current_user_id) {
      return new Response(JSON.stringify({
        error: 'Current user ID is missing after authentication.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // --- Main logic for fetching suggestions ---
    const { data: currentUserProfileData, error: currentUserProfileError } = await supabaseClient.from('profiles').select('profile_id').eq('user_id', current_user_id).single();
    if (currentUserProfileError || !currentUserProfileData) {
      console.error('Error fetching current user profile ID for suggestions:', currentUserProfileError?.message);
      return new Response(JSON.stringify({
        error: 'Your profile not found to generate suggestions.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }
    const current_user_profile_id = currentUserProfileData.profile_id;
    const connectedUserIds = new Set();
    const blockedUserIds = new Set();
    connectedUserIds.add(current_user_id); // Add current user's own UUID to prevent self-suggestion
    const { data: existingMatches, error: matchesError } = await supabaseClient.from('matches').select('match_user1_id, match_user2_id, status').or(`match_user1_id.eq.${current_user_id},match_user2_id.eq.${current_user_id}`);
    if (matchesError) {
      console.error('Error fetching existing matches in Edge Function:', matchesError.message);
      return new Response(JSON.stringify({
        error: 'Error fetching existing matches.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    existingMatches.forEach((match)=>{
      if (match.status === 'accepted' || match.status === 'pending') {
        connectedUserIds.add(match.match_user1_id);
        connectedUserIds.add(match.match_user2_id);
      }
    });
    const { data: blockedRelations, error: blockedError } = await supabaseClient.from('blocked_users').select('blocked_id').eq('blocker_id', current_user_id);
    if (blockedError) {
      console.error('Error fetching blocked users in Edge Function:', blockedError.message);
      return new Response(JSON.stringify({
        error: 'Error fetching blocked users.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    blockedRelations.forEach((block)=>blockedUserIds.add(block.blocked_id));
    // Start building the query
    let query = supabaseClient.from('profiles').select(`
            profile_id,
            user_id,
            profile_username,
            profile_bio,
            profile_birthdate,
            profile_academic_interests,
            profile_non_academic_interests,
            profile_looking_for,
            profile_avatar_url,
            profile_gender,
            users (user_priset_show_age, user_priset_show_bio, user_priset_is_private)
        `).neq('user_id', current_user_id); // Exclude self by user_id
    // Conditionally apply filters if the sets are not empty
    if (connectedUserIds.size > 0) {
      const ids = Array.from(connectedUserIds).join(',');
      query = query.filter('user_id', 'not.in', `(${ids})`);
    }
    if (blockedUserIds.size > 0) {
      const ids = Array.from(blockedUserIds).join(',');
      query = query.filter('user_id', 'not.in', `(${ids})`);
    }
    // Execute the query
    const { data: potentialSuggestions, error: profilesError } = await query.order('profile_created_at', {
      ascending: false
    }).limit(20);
    if (profilesError) {
      console.error('Error fetching potential suggestions from profiles:', profilesError.message);
      return new Response(JSON.stringify({
        error: 'Error fetching potential suggestions.'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    // Filter out private profiles and map to expected format
    const finalSuggestions = potentialSuggestions.filter((sug)=>{
      const isPrivate = sug.users?.user_priset_is_private;
      return !isPrivate; // Only include if NOT private
    }).map((sug)=>({
        profile_id: sug.profile_id,
        user_id: sug.user_id,
        profile_username: sug.profile_username,
        profile_bio: sug.profile_bio,
        profile_birthdate: sug.profile_birthdate,
        profile_academic_interests: sug.profile_academic_interests,
        profile_non_academic_interests: sug.profile_non_academic_interests,
        profile_looking_for: sug.profile_looking_for,
        profile_avatar_url: sug.profile_avatar_url,
        profile_gender: sug.profile_gender,
        user_priset_show_age: sug.users?.user_priset_show_age ?? true,
        user_priset_show_bio: sug.users?.user_priset_show_bio ?? true,
        compatibility_score: Math.floor(Math.random() * 100) + 1
      }));
    return new Response(JSON.stringify({
      suggestions: finalSuggestions
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("Edge Function internal error (main logic):", error.message);
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred.'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
