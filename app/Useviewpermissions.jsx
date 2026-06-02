import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { API_BASE_URL } = Constants.expoConfig.extra;

export const VIEW_LEVEL = {
  ALL:    'all',
  BRANCH: 'branch',
  TEAM:   'team',
};

export function resolveViewLevel(user) {
  if (!user) {
    console.warn('[resolveViewLevel] user is null — defaulting to TEAM (most restrictive)');
    return VIEW_LEVEL.TEAM;
  }

  const ug = user.user_group;
  const groupInitials = (
    (typeof ug === 'object' ? ug?.initials : null) ?? ''
  ).toLowerCase().trim();
  const groupName = (
    typeof ug === 'string' ? ug : (ug?.name ?? '')
  ).toLowerCase().trim();

  const canViewAllData = !!(user.permissions?.all_branches_data);

  console.log('[resolveViewLevel]', { groupInitials, groupName, canViewAllData, raw_user_group: ug });

  // Admin or explicit all-branches permission → full access
  if (groupInitials === 'admin' || groupName === 'admin' || canViewAllData) {
    return VIEW_LEVEL.ALL;
  }

  // BUG FIX: also match 'bm' (Branch Manager) initials and common variants
  const branchLevelInitials = ['tl', 'bm', 'bl'];
  const branchLevelNames    = ['team leader', 'branch manager', 'branch leader'];
  if (
    branchLevelInitials.includes(groupInitials) ||
    branchLevelNames.includes(groupName)
  ) {
    return VIEW_LEVEL.BRANCH;
  }

  // BDO / BDE / everyone else → team-scoped
  return VIEW_LEVEL.TEAM;
}

async function fetchFullProfile(token) {
  const url = `${API_BASE_URL}/api/users/currentUser`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  const contentType = response.headers.get('content-type') || '';
  if (!response.ok || !contentType.includes('application/json')) {
    throw new Error(`Profile API ${url} returned ${response.status}`);
  }

  const result = await response.json();
  console.log('[fetchFullProfile] raw response:', JSON.stringify(result, null, 2));

  const candidate = Array.isArray(result?.payload)
    ? result.payload[0]
    : result?.payload ?? result?.user ?? result?.data ?? (result?.id ? result : null);

  if (!candidate) throw new Error('Profile API returned empty payload');

  return candidate;
}

async function fetchTeamsForBranch(token, branchId) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/teams?branch_id=${branchId}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    });
    const data = await res.json();
    console.log('[fetchTeamsForBranch] response:', JSON.stringify(data));
    if (data.success && data.payload) {
      return data.payload.map(t => ({ ...t, id: String(t.id) }));
    }
  } catch (err) {
    console.warn('[fetchTeamsForBranch] error:', err.message);
  }
  return [];
}

export function useViewPermissions({ persist = false } = {}) {
  const [viewLevel,         setViewLevel]         = useState(null);
  const [viewType,          setViewType]          = useState(VIEW_LEVEL.ALL);
  const [selectedView,      setSelectedView]      = useState(null);
  const [userBranch,        setUserBranch]        = useState(null);
  const [userTeam,          setUserTeam]          = useState(null);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [availableTeams,    setAvailableTeams]    = useState([]);
  const [loadingViews,      setLoadingViews]      = useState(false);

  const applyUser = useCallback(async (user, level, token) => {
    const ub = user?.branch
      ? { id: String(user.branch.id), name: user.branch.name }
      : null;

    // BUG FIX: check all common team fields the API might return
    const rawTeam = user?.bdos_in_team ?? user?.team ?? user?.cluster ?? null;
    const ut = rawTeam
      ? { id: String(rawTeam.id), name: rawTeam.name }
      : null;

    setUserBranch(ub);
    setUserTeam(ut);

    if (level === VIEW_LEVEL.ALL) {
      // Admin: restore persisted view or default to all
      if (persist) {
        const savedType    = await AsyncStorage.getItem('savedViewType');
        const savedItemStr = await AsyncStorage.getItem('savedViewItem');
        let savedItem = null;
        try { savedItem = savedItemStr ? JSON.parse(savedItemStr) : null; } catch {}
        setViewType(savedType || VIEW_LEVEL.ALL);
        setSelectedView(savedItem);
      } else {
        setViewType(VIEW_LEVEL.ALL);
        setSelectedView(null);
      }

    } else if (level === VIEW_LEVEL.BRANCH) {
      // TL / BM: default to their branch, can switch to any team under it
      setViewType(VIEW_LEVEL.BRANCH);
      setSelectedView(ub);
      if (ub) setAvailableBranches([ub]);

      // Eagerly load their branch's teams so the switcher modal is ready
      if (ub && token) {
        console.log('[applyUser] TL/BM — fetching teams for branch:', ub.id);
        const teams = await fetchTeamsForBranch(token, ub.id);
        console.log('[applyUser] teams fetched:', JSON.stringify(teams));
        setAvailableTeams(teams);
      }

    } else {
      
      if (ut) {
        setViewType(VIEW_LEVEL.TEAM);
        setSelectedView(ut);
        setAvailableTeams([ut]);
      } else {
        console.warn(
          '[applyUser] BDO/BDE has no team assigned — falling back to branch view.',
          'Check that the profile API returns bdos_in_team / team / cluster.'
        );
        setViewType(VIEW_LEVEL.BRANCH);
        setSelectedView(ub);
      }
      if (ub) setAvailableBranches([ub]);
    }
  }, [persist]);

  const loadProfile = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('[useViewPermissions] no token yet');
        return;
      }

      let user = null;

      try {
        user = await fetchFullProfile(token);
        if (user) await AsyncStorage.setItem('cachedFullProfile', JSON.stringify(user));
      } catch (apiErr) {
        console.warn('[useViewPermissions] profile API failed, trying cache:', apiErr.message);
        const cached = await AsyncStorage.getItem('cachedFullProfile');
        if (cached) {
          try { user = JSON.parse(cached); } catch {}
        }
      }

      const level = resolveViewLevel(user);
      setViewLevel(level);
      await applyUser(user, level, token);

    } catch (err) {
      console.error('[useViewPermissions] loadProfile error:', err);
      setViewLevel(VIEW_LEVEL.TEAM);
      setViewType(VIEW_LEVEL.TEAM);
      setSelectedView(null);
    }
  }, [applyUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    console.log('[useViewPermissions] availableTeams changed →', JSON.stringify(availableTeams));
  }, [availableTeams]);

  const reloadProfile = useCallback(() => loadProfile(), [loadProfile]);

  const fetchViewOptions = useCallback(async (overrideLevel, overrideBranch) => {
    const level  = overrideLevel  ?? viewLevel;
    const branch = overrideBranch ?? userBranch;

    console.log('[fetchViewOptions] START — level:', level, '| branch:', JSON.stringify(branch));
    setLoadingViews(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

        if (level === VIEW_LEVEL.ALL) {
          // Admin: fetch all branches, then all teams globally
          const brRes = await fetch(`${API_BASE_URL}/api/branches`, { headers, credentials: 'include' });
          const brData = await brRes.json();
          if (brData.success) {
            setAvailableBranches((brData.payload || []).map(b => ({ ...b, id: String(b.id) })));
          }

          // Fetch all teams — same endpoint as branch-level, just without a branch_id filter
          const teRes = await fetch(`${API_BASE_URL}/api/teams`, { headers, credentials: 'include' });
          const teData = await teRes.json();
          if (teData.success) {
            setAvailableTeams((teData.payload || []).map(t => ({ ...t, id: String(t.id) })));
          }
        } else if (level === VIEW_LEVEL.BRANCH) {
        // TL / BM: only their own branch + teams under it
        if (branch) setAvailableBranches([branch]);
        const teams = await fetchTeamsForBranch(
          await AsyncStorage.getItem('token'),
          branch?.id
        );
        console.log('[fetchViewOptions] BRANCH refreshed teams:', JSON.stringify(teams));
        setAvailableTeams(teams);

      } else {
        // BDO / BDE: no switching — lock to their team (and branch for display)
        if (branch)   setAvailableBranches([branch]);
        if (userTeam) setAvailableTeams([userTeam]);
      }

    } catch (err) {
      console.error('[useViewPermissions] fetchViewOptions error:', err);
    } finally {
      setLoadingViews(false);
      console.log('[fetchViewOptions] DONE');
    }
  }, [viewLevel, userBranch, userTeam]);

  const handleViewSelection = useCallback((type, item = null) => {
   
    if (viewLevel === VIEW_LEVEL.BRANCH && type === VIEW_LEVEL.ALL) {
      console.warn('[useViewPermissions] BRANCH user blocked from ALL view');
      return;
    }
    if (viewLevel === VIEW_LEVEL.TEAM && type !== VIEW_LEVEL.TEAM) {
      // BDO/BDE may only view their own team — no branch-wide or all view
      console.warn('[useViewPermissions] TEAM user blocked from', type, 'view');
      return;
    }

    const normalizedItem = item ? { ...item, id: String(item.id) } : null;
    setViewType(type);
    setSelectedView(normalizedItem);

    if (persist) {
      AsyncStorage.setItem('savedViewType', type);
      AsyncStorage.setItem('savedViewItem', normalizedItem ? JSON.stringify(normalizedItem) : '');
    }
  }, [viewLevel, persist]);

  const getViewLabel = useCallback(() => {
    if (viewLevel === VIEW_LEVEL.ALL) {
      if (viewType === VIEW_LEVEL.ALL)                    return 'All Branches';
      if (viewType === VIEW_LEVEL.BRANCH && selectedView) return selectedView.name;
      if (viewType === VIEW_LEVEL.TEAM   && selectedView) return selectedView.name;
      return 'All Branches';
    }
    if (viewLevel === VIEW_LEVEL.BRANCH) {
      if (viewType === VIEW_LEVEL.TEAM   && selectedView) return selectedView.name;
      if (viewType === VIEW_LEVEL.BRANCH && selectedView) return selectedView.name;
      if (userBranch)                                     return userBranch.name;
      return 'My Branch';
    }
    if (viewLevel === VIEW_LEVEL.TEAM) {
      if (viewType === VIEW_LEVEL.TEAM   && selectedView) return selectedView.name;
      if (userTeam)                                       return userTeam.name;
      if (userBranch)                                     return userBranch.name;
      return 'My Team';
    }
    return 'Loading…';
  }, [viewType, selectedView, viewLevel, userBranch, userTeam]);

  const canSwitchView = viewLevel !== VIEW_LEVEL.TEAM;

  return {
    viewType,
    selectedView,
    viewLevel,
    canSwitchView,
    getViewLabel,
    handleViewSelection,
    availableBranches,
    availableTeams,
    userBranch,
    userTeam,
    loadingViews,
    fetchViewOptions,
    reloadProfile,
  };
}