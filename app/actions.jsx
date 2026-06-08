import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { useViewPermissions, VIEW_LEVEL } from './Useviewpermissions';
import ViewSwitcherModal from './Viewswitchermodal';

const { API_BASE_URL } = Constants.expoConfig.extra;
const { width } = Dimensions.get('window');
const ACCENT = '#2196F3';

const actions = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showViewModal, setShowViewModal] = useState(false);
  const {
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
  } = useViewPermissions({ persist: true });

  const [clientSummary, setClientSummary] = useState(null);
  const [loanSummary, setLoanSummary] = useState(null);
  const [requestSummary, setRequestSummary] = useState(null);

  const [dashboardData, setDashboardData] = useState({
    actions: [
      { id: 1,  label: 'Add a new Customer',       icon: 'person-add',      color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#00BCD4', route: '/newlead' },
      { id: 2,  label: 'Allocate Customer',         icon: 'sync',            color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#00BCD4', count: 0, route: '/client_summary' },
      { id: 3,  label: 'Assess Customer',           icon: 'document-text',   color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', count: 0, route: '/client_summary' },
      { id: 4,  label: 'Approve Customer',          icon: 'alert-circle',    color: '#FFEBEE', iconColor: '#C62828', borderColor: '#C62828', count: 0, route: '/client_summary' },
      { id: 5,  label: 'Onboard Customer',          icon: 'send',            color: '#E3F2FD', iconColor: '#1976D2', borderColor: '#1976D2', count: 0, route: '/client_summary' },
      { id: 6,  label: 'Approve Onboard TL',        icon: 'checkmark-circle',color: '#E8F5E9', iconColor: '#388E3C', borderColor: '#4CAF50', count: 0, route: 'ApproveOnboardTL' },
      { id: 7,  label: 'Approve Onboard HQ',        icon: 'checkmark-circle',color: '#E8F5E9', iconColor: '#388E3C', borderColor: '#4CAF50', count: 0, route: 'ApproveOnboardHQ' },
      { id: 13, label: 'Pay RF',                    icon: 'document-attach', color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', count: 0, route: '/client_summary' },
      { id: 14, label: 'Apply Loan',                icon: 'cash',            color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#00BCD4', route: '/client_summary' },
      { id: 15, label: 'Approve Loan Request TL',   icon: 'checkmark-done',  color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', count: 0, route: '/requestReport' },
      { id: 9,  label: 'Create Loan/Top Up',        icon: 'hand-left',       color: '#D1F4F7', iconColor: '#00BCD4', borderColor: '#2196F3', route: '/requestReport' },
      { id: 10, label: 'Approve Loan TL',           icon: 'document-text',   color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', subtitle: 'Ksh 0', count: 0, route: '/loan_summary' },
      { id: 11, label: 'Approve Loan HQ',           icon: 'document-text',   color: '#FFF9E6', iconColor: '#F57C00', borderColor: '#F57C00', subtitle: 'Ksh 0', count: 0, route: '/loan_summary' },
      { id: 12, label: 'Disburse Loan',             icon: 'send',            color: '#E3F2FD', iconColor: '#1976D2', borderColor: '#2196F3', subtitle: 'Ksh 0', count: 0, route: '/onboard' },
    ],
  });

  const ACTION_STATUS_MAP = {
    2:  { status: 0,            label: 'Pending Allocation',        type: 'client' },
    3:  { status: 1,            label: 'Pending Assessment',        type: 'client' },
    4:  { status: 2,            label: 'Pending Approval',          type: 'client' },
    5:  { status: 3,            label: 'Pending Onboarding',        type: 'client' },
    6:  { status: 4,            label: 'Pending BM Approval',       type: 'client' },
    7:  { status: 5,            label: 'Pending HQ Approval',       type: 'client' },
    13: { status: 'pending_rf', label: 'Pending RF',                type: 'client' },
    15: { status: 0,            label: 'Pending Approval Request',  type: 'request' },
    9:  { status: 1,            label: 'Approved',                  type: 'request' },
    10: { status: 0,            label: 'Pending BM Approval',       type: 'loan' },
    11: { status: 2,            label: 'Pending HQ Approval',       type: 'loan' },
    12: { status: 3,            label: 'Pending Disbursement',      type: 'loan' },
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    getUserId();
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (viewLevel === null) return;
    fetchDashboardData(viewType, selectedView);
  }, [viewType, selectedView, viewLevel]);

  const getUserId = async () => {
    try {
      const id = await AsyncStorage.getItem('userId');
      if (id) setUserId(id);
    } catch {}
  };

  const handleViewButtonPress = async () => {
    if (viewLevel === null) return;
    // if (!canSwitchView) return;
    await fetchViewOptions(viewLevel, userBranch);
    setShowViewModal(true);
  };

  const onSelectView = (type, item) => {
    handleViewSelection(type, item);
    setShowViewModal(false);
  };

  
  const viewIcon =
    viewType === VIEW_LEVEL.TEAM   ? 'people'
    : viewType === VIEW_LEVEL.BRANCH ? 'location'
    : 'business';


  const buildViewBody = (vType, sView) => {
    const body = {};
    if (vType === VIEW_LEVEL.BRANCH && sView) body.branch_id  = sView.id;
    if (vType === VIEW_LEVEL.TEAM   && sView) body.cluster_id = sView.id; 
    return body;
  };

  const fetchClientSummary = async (vType, sView, token) => {
    try {
      const body = buildViewBody(vType, sView);
      const response = await fetch(`${API_BASE_URL}/api/members/getpaginatedclients/1/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success && result.additional_data?.summary) {
        setClientSummary(result.additional_data.summary);
        return result.additional_data.summary;
      }
    } catch (err) { console.error('fetchClientSummary:', err); }
    return null;
  };

  const fetchLoanSummary = async (vType, sView, token) => {
    try {
      const body = buildViewBody(vType, sView);
      const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedloans/1/100`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success) {
        let summary = result.additional_data?.summary || {};
        if (Array.isArray(result.payload)) {
          const loans = result.payload;
          summary = {
            ...summary,
            total_pending_bm_approval_amount:   loans.filter(l => l.status === 0).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
            total_pending_hq_approval_amount:   loans.filter(l => l.status === 2).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
            total_pending_disbursement_amount:  loans.filter(l => l.status === 3).reduce((s, l) => s + (parseFloat(l.amount) || 0), 0),
          };
        }
        setLoanSummary(summary);
        return summary;
      }
    } catch (err) { console.error('fetchLoanSummary:', err); }
    return null;
  };

  const fetchRequestSummary = async (vType, sView, token) => {
    try {
      const body = {};
      if (vType === VIEW_LEVEL.BRANCH && sView) body.branch  = sView.id;
      if (vType === VIEW_LEVEL.TEAM   && sView) body.cluster = sView.id; 
      const response = await fetch(`${API_BASE_URL}/api/loans/requests/list/1/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (result.success && result.additional_data?.summary) {
        setRequestSummary(result.additional_data.summary);
        return result.additional_data.summary;
      }
    } catch (err) { console.error('fetchRequestSummary:', err); }
    return null;
  };

  const fetchDashboardData = async (vType = viewType, sView = selectedView) => {
    try {
      setLoading(true); setError(null);
      const token = await AsyncStorage.getItem('token');
      const [clientSum, loanSum, requestSum] = await Promise.all([
        fetchClientSummary(vType, sView, token),
        fetchLoanSummary(vType, sView, token),
        fetchRequestSummary(vType, sView, token),
      ]);
      if (clientSum || loanSum || requestSum) updateActionCounts(clientSum, loanSum, requestSum);
    } catch (err) {
      console.error('fetchDashboardData:', err);
      setError('Failed to load dashboard data');
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally { setLoading(false); }
  };

  const updateActionCounts = (clientSum, loanSum, requestSum) => {
    setDashboardData(prev => ({
      ...prev,
      actions: prev.actions.map(action => {
        switch (action.id) {
          case 2: {
            const total = clientSum?.total_no_of_clients || 0;
            const accounted =
              (clientSum?.total_pending_assessment || 0) +
              (clientSum?.total_pending_approval || 0) +
              (clientSum?.total_pending_onboarding || 0) +
              (clientSum?.total_pending_bm_approval || 0) +
              (clientSum?.total_pending_hq_approval || 0) +
              (clientSum?.total_pending_appraisal || 0) +
              (clientSum?.total_pending_appraisal_bm_approval || 0) +
              (clientSum?.total_pending_appraisal_hq_approval || 0) +
              (clientSum?.pending_rf || 0) +
              (clientSum?.total_dormant || 0) +
              (clientSum?.total_active || 0) +
              (clientSum?.total_blacklisted || 0);
            return { ...action, count: Math.max(0, total - accounted) };
          }
          case 3:  return { ...action, count: clientSum?.total_pending_assessment || 0 };
          case 4:  return { ...action, count: clientSum?.total_pending_approval || 0 };
          case 5:  return { ...action, count: clientSum?.total_pending_onboarding || 0 };
          case 6:  return { ...action, count: clientSum?.total_pending_bm_approval || 0 };
          case 7:  return { ...action, count: clientSum?.total_pending_hq_approval || 0 };
          case 13: return { ...action, count: clientSum?.pending_rf || 0 };
          case 8:  return { ...action, count: (clientSum?.total_dormant || 0) + (clientSum?.total_active || 0) };
          case 9:  return { ...action, count: requestSum?.total_approved || 0 };
          case 10: {
            const amount = loanSum?.total_pending_bm_approval_amount || 0;
            return { ...action, count: loanSum?.total_pending_bm_approval || 0, subtitle: `Ksh ${formatNumber(amount)}` };
          }
          case 11: {
            const amount = loanSum?.total_pending_hq_approval_amount || 0;
            return { ...action, count: loanSum?.total_pending_hq_approval || 0, subtitle: `Ksh ${formatNumber(amount)}` };
          }
          case 12: {
            const amount = loanSum?.total_pending_disbursement_amount || 0;
            return { ...action, count: loanSum?.total_pending_disbursements || 0, subtitle: `Ksh ${formatNumber(amount)}` };
          }
          case 15: return { ...action, count: requestSum?.total_pending_approval || 0 };
          default: return action;
        }
      }),
    }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(viewType, selectedView);
    setRefreshing(false);
  };

  const formatDate   = (date) => date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
  const formatNumber = (num)  => num.toLocaleString('en-US');

  const handleActionPress = (action) => {
    if (action.id === 1) { router.push('/newlead'); return; }

    const viewParams = {};
    if (viewType === VIEW_LEVEL.BRANCH && selectedView) viewParams.viewBranchId  = selectedView.id;
    if (viewType === VIEW_LEVEL.TEAM   && selectedView) viewParams.viewClusterId = selectedView.id; // backend param

    const actionConfig = ACTION_STATUS_MAP[action.id];
    if (!actionConfig) {
      if (action.route) router.push({ pathname: action.route, params: viewParams });
      return;
    }

    if (actionConfig.type === 'client') {
      router.push({ pathname: '/client_summary', params: { statusFilter: actionConfig.status, filterLabel: actionConfig.label, ...viewParams } });
    } else if (actionConfig.type === 'loan') {
      router.push({ pathname: '/loan_summary', params: { statusFilter: actionConfig.status, filterLabel: actionConfig.label, ...viewParams } });
    } else if (actionConfig.type === 'request') {
      router.push({ pathname: '/requestReport', params: { statusFilter: actionConfig.status, filterLabel: actionConfig.label } });
    }
  };

  const handleProfilePress = () => {
    if (userId) router.push({ pathname: '/userProfile', params: { userId } });
  };

  const handleLoansDuePress = () => {
    const viewParams = {};
    if (viewType === VIEW_LEVEL.BRANCH && selectedView) viewParams.viewBranchId  = selectedView.id;
    if (viewType === VIEW_LEVEL.TEAM   && selectedView) viewParams.viewClusterId = selectedView.id;
    router.push({ pathname: '/loan_summary', params: { dueInDays: 3, filterLabel: 'Loans Due in 3 Days', ...viewParams } });
  };

  const renderActionItem = (action) => {
    const isOrange = [3, 10, 11, 13, 15].includes(action.id);
    const isRed    = action.id === 4;
    const isGreen  = [6, 7].includes(action.id);
    const labelColor = isOrange ? '#E65100' : isRed ? '#C62828' : isGreen ? '#2E7D32' : '#0277BD';
    const badgeBg    = isOrange ? '#FFE0B2' : isRed ? '#FFCDD2' : isGreen ? '#C8E6C9' : '#B3E5FC';

    return (
      <TouchableOpacity
        key={action.id}
        style={[styles.actionItem, { backgroundColor: action.color, borderColor: action.borderColor }]}
        onPress={() => handleActionPress(action)}
        activeOpacity={0.7}
      >
        <View style={styles.actionContent}>
          <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
            <Ionicons name={action.icon} size={28} color={action.iconColor} />
          </View>
          <View style={styles.actionTextContainer}>
            <Text style={[styles.actionLabel, { color: labelColor }]}>{action.label}</Text>
            {action.subtitle && <Text style={styles.actionSubtitle}>{action.subtitle}</Text>}
          </View>
          {action.count !== undefined && (
            <View style={[styles.actionBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.actionBadgeText, { color: labelColor }]}>
                {loading ? '…' : action.count}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[ACCENT]} tintColor={ACCENT} />}
      >
        {/* Date + View Switcher */}
        <View style={styles.dateSection}>
          <View style={styles.dateLeft}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{formatDate(currentDate)}</Text>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.switchViewLabel}>
                {canSwitchView ? 'Switch View' : 'Current View'}
              </Text>
              <TouchableOpacity
                style={styles.currentViewBox}
                onPress={handleViewButtonPress}
                activeOpacity={0.7}
              >
              <View style={styles.currentViewContent}>
                <Ionicons name={viewIcon} size={14} color={ACCENT} />
                <View style={styles.currentViewTextWrapper}>
                  <Text style={styles.currentViewMiniLabel}>
                    {viewLevel === null ? 'Loading…' : canSwitchView ? 'Current View:' : 'Your View:'}
                  </Text>
                  <Text style={styles.currentViewValue} numberOfLines={1}>
                    {viewLevel === null ? '—' : getViewLabel()}
                  </Text>
                </View>
                {canSwitchView
                  ? <Ionicons name="chevron-down" size={14} color={ACCENT} />
                  : <Ionicons name="lock-closed-outline" size={13} color={ACCENT} style={{ opacity: 0.45 }} />}
              </View>
              </TouchableOpacity>
            </View>

            <View style={styles.quickButtonsRow}>
              <TouchableOpacity style={styles.loansDueButton} onPress={handleLoansDuePress}>
                <Ionicons name="time-outline" size={18} color="#E53935" />
                <Text style={styles.loansDueButtonText}>Loans</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.kpiButton} onPress={() => router.push('/kpiTeams')}>
                <Ionicons name="bar-chart-outline" size={18} color="#1565C0" />
                <Text style={styles.kpiButtonText}>KPI</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.dateRight}>
            <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
              <Ionicons name="person" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrearsButton}
              onPress={() => {
                const viewParams = {};
                if (viewType === VIEW_LEVEL.BRANCH && selectedView) viewParams.viewBranchId  = selectedView.id;
                if (viewType === VIEW_LEVEL.TEAM   && selectedView) viewParams.viewClusterId = selectedView.id;
                router.push({ pathname: '/arrearsReport', params: viewParams });
              }}
            >
              <Ionicons name="warning" size={18} color="#FF6B6B" />
              <Text style={styles.arrearsButtonText}>Arrears</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.arrearsButton}
              onPress={() => {
                const viewParams = {};
                if (viewType === VIEW_LEVEL.BRANCH && selectedView) viewParams.viewBranchId  = selectedView.id;
                if (viewType === VIEW_LEVEL.TEAM   && selectedView) viewParams.viewClusterId = selectedView.id;
                router.push({ pathname: '/defaultedLoans', params: viewParams });
              }}
            >
              <Ionicons name="alert-circle" size={18} color="#E53935" />
              <Text style={styles.defaultedButtonText}>Defaulted</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={24} color={ACCENT} />
            <Text style={styles.sectionTitle}>My Actions</Text>
          </View>
          <View style={styles.actionsContainer}>
            {dashboardData.actions.map(renderActionItem)}
          </View>
        </View>
      </ScrollView>

      <ViewSwitcherModal
        visible={showViewModal}
        onClose={() => setShowViewModal(false)}
        onSelect={onSelectView}
        viewType={viewType}
        selectedView={selectedView}
        viewLevel={viewLevel}
        availableBranches={availableBranches}
        availableTeams={availableTeams}
        userBranch={userBranch}
        userTeam={userTeam}
        loading={loadingViews}
        accentColor={ACCENT}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  contentContainer: { paddingBottom: 40 },

  dateSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dateLeft:  { flex: 1 },
  dateRight: { alignItems: 'flex-end', gap: 10, justifyContent: 'center', alignSelf: 'stretch' },
  dateLabel: { fontSize: 18, fontWeight: 'bold', color: '#000000', marginBottom: 4 },
  dateValue: { fontSize: 14, color: '#666666' },

  switchViewLabel: { fontSize: 12, color: '#666666', marginBottom: 6, fontWeight: '500' },
  currentViewBox: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    maxWidth: 160,
  },
  currentViewContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currentViewValue: { fontSize: 13, fontWeight: '600', color: ACCENT, },
  currentViewTextWrapper: {
    flex: 1,          
    minWidth: 0,      
  },
  currentViewMiniLabel: { 
    fontSize: 9, 
    color: '#757575', 
    marginBottom: 1,
  },
  profileButton: {
    width: 44, height: 44,
    backgroundColor: ACCENT,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  loansDueButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: '#E53935',
  },
  loansDueButtonText: { fontSize: 12, fontWeight: '600', color: '#E53935', marginLeft: 6 },
  kpiButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: '#1565C0',
  },
  kpiButtonText: { fontSize: 12, fontWeight: '600', color: '#1565C0', marginLeft: 6 },

  arrearsButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFE5E5', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: '#FF6B6B',
    marginTop: 4, marginLeft: 'auto',
  },
  arrearsButtonText:   { fontSize: 12, fontWeight: '600', color: '#FF6B6B', marginLeft: 6 },
  defaultedButtonText: { fontSize: 12, fontWeight: '600', color: '#E53935', marginLeft: 6 },

  sectionHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle:     { fontSize: 16, fontWeight: 'bold', color: '#000000', marginLeft: 8 },
  actionsSection:   { paddingHorizontal: 20 },
  actionsContainer: { gap: 12 },

  actionItem:          { borderRadius: 12, padding: 12, borderWidth: 2 },
  actionContent:       { flexDirection: 'row', alignItems: 'center' },
  actionIconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  actionTextContainer: { flex: 1 },
  actionLabel:         { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  actionSubtitle:      { fontSize: 11, color: '#666666', marginTop: 2 },
  actionBadge:         { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, minWidth: 32, alignItems: 'center', justifyContent: 'center' },
  actionBadgeText:     { fontSize: 13, fontWeight: 'bold' },

});

export default actions;