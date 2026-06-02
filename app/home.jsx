import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';

import { useViewPermissions, VIEW_LEVEL } from './Useviewpermissions';
import ViewSwitcherModal from './Viewswitchermodal';

const { API_BASE_URL } = Constants.expoConfig.extra;
const ACCENT = '#2D5BFF';

// ── Universal success check — your API returns {status:"success"} not {success:true}
const isOk = (r) => r?.success === true || r?.status === 'success';

export default function HomeScreen() {
  const [currentDate, setCurrentDate] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);

  const {
    viewType, selectedView, viewLevel, canSwitchView,
    getViewLabel, handleViewSelection,
    availableBranches, availableTeams,
    userBranch, userTeam,
    loadingViews, fetchViewOptions,
  } = useViewPermissions({ persist: false });

  const [idrData, setIdrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [customerSummary, setCustomerSummary] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(true);
  const [customerError, setCustomerError] = useState(null);

  const [loansSummary, setLoansSummary] = useState(null);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState(null);

  const [installmentsSummary, setInstallmentsSummary] = useState(null);
  const [installmentsLoading, setInstallmentsLoading] = useState(true);
  const [installmentsError, setInstallmentsError] = useState(null);

  const [cashBalanceData, setCashBalanceData] = useState(null);
  const [cashBalanceLoading, setCashBalanceLoading] = useState(true);
  const [cashBalanceError, setCashBalanceError] = useState(null);

  const [paymentsSummary, setPaymentsSummary] = useState(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsError, setPaymentsError] = useState(null);

  const [collectionsData, setCollectionsData] = useState(null);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState(null);

  const [disbursementsData, setDisbursementsData] = useState(null);
  const [disbursementsLoading, setDisbursementsLoading] = useState(true);
  const [disbursementsError, setDisbursementsError] = useState(null);

  const [kpiTeamsData, setKpiTeamsData] = useState(null);
  const [kpiTeamsLoading, setKpiTeamsLoading] = useState(true);
  const [kpiTeamsError, setKpiTeamsError] = useState(null);

  const [dateFilter, setDateFilter] = useState('mtd');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Build query string params based on viewType/selectedView
  // Each endpoint has its own param names — we pass them explicitly
  const buildQS = (vType, sView, branchParam = 'branch_id', teamParam = 'cluster') => {
    if (vType === VIEW_LEVEL.BRANCH && sView) return `?${branchParam}=${sView.id}`;
    if (vType === VIEW_LEVEL.TEAM   && sView) return `?${teamParam}=${sView.id}`;
    return '';
  };

  const buildBody = (vType, sView, branchParam = 'branch_id', teamParam = 'cluster_id') => {
    const body = {};
    if (vType === VIEW_LEVEL.BRANCH && sView) body[branchParam] = sView.id;
    if (vType === VIEW_LEVEL.TEAM   && sView) body[teamParam]   = sView.id;
    return body;
  };

  // ── Date label
  useEffect(() => {
    const today = new Date();
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    setCurrentDate(`${days[today.getDay()].slice(0,3)}, ${today.getDate()}, ${months[today.getMonth()]} ${today.getFullYear()}`);
  }, []);

  // ── Fetch everything when view changes
  useEffect(() => {
    if (viewLevel === null) return;
    fetchAll(viewType, selectedView, dateFilter);
  }, [viewType, selectedView, viewLevel]);

  // ── Re-fetch collections/disbursements when date filter changes
  useEffect(() => {
    if (viewLevel === null) return;
    fetchCollections(viewType, selectedView, dateFilter);
    fetchDisbursements(viewType, selectedView, dateFilter);
  }, [dateFilter]);

  const fetchAll = (vType, sView, dFilter) => {
    fetchIDRData(vType, sView);
    fetchCashBalance(vType, sView);       // ✅ now view-aware
    fetchKpiTeams(vType, sView);          // ✅ now view-aware
    fetchCustomerSummary(vType, sView);
    fetchLoansSummary(vType, sView);
    fetchInstallmentsSummary(vType, sView);
    fetchPaymentsSummary(vType, sView);
    fetchCollections(vType, sView, dFilter);
    fetchDisbursements(vType, sView, dFilter);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchIDRData(viewType, selectedView),
      fetchCashBalance(viewType, selectedView),
      fetchKpiTeams(viewType, selectedView),
      fetchCollections(viewType, selectedView, dateFilter),
      fetchDisbursements(viewType, selectedView, dateFilter),
      fetchCustomerSummary(viewType, selectedView),
      fetchLoansSummary(viewType, selectedView),
      fetchInstallmentsSummary(viewType, selectedView),
      fetchPaymentsSummary(viewType, selectedView),
    ]);
    setRefreshing(false);
  };

  const handleViewButtonPress = async () => {
    if (viewLevel === null) return;
    await fetchViewOptions(viewLevel, userBranch);  // ← await it
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

  // ────────────────────────────────────────────────────────────────────────────
  // FETCH FUNCTIONS
  // ────────────────────────────────────────────────────────────────────────────

  const fetchIDRData = async (vType = viewType, sView = selectedView) => {
    try {
      setLoading(true); setError(null);
      const token = await AsyncStorage.getItem("token");
      // endpoint uses: branch_id / cluster
      const qs = buildQS(vType, sView, 'branch_id', 'cluster');
      const response = await fetch(`${API_BASE_URL}/api/dashboard/idr${qs}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const result = await response.json();
      if (isOk(result) && result.payload) setIdrData(result.payload);
      else setError(result.error || 'Failed to fetch IDR data');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  // ✅ BU / Cash Balance — now accepts vType/sView so BDO sees only their team's data
  const fetchCashBalance = async (vType = viewType, sView = selectedView) => {
    try {
      setCashBalanceLoading(true); setCashBalanceError(null);
      const token = await AsyncStorage.getItem("token");
      // endpoint uses: branch_id / cluster
      let qs = 'period=mtd';
      if (vType === VIEW_LEVEL.BRANCH && sView) qs += `&branch_id=${sView.id}`;
      if (vType === VIEW_LEVEL.TEAM   && sView) qs += `&cluster=${sView.id}`;
      const response = await fetch(`${API_BASE_URL}/api/cash_balance?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (isOk(result) && result.payload) setCashBalanceData(result.payload);
      else setCashBalanceError(result.error || 'Failed to fetch cash balance');
    } catch (err) { setCashBalanceError(err.message || 'Network error.'); }
    finally { setCashBalanceLoading(false); }
  };

  // ✅ KPI Teams — now accepts vType/sView
  const fetchKpiTeams = async (vType = viewType, sView = selectedView) => {
    try {
      setKpiTeamsLoading(true); setKpiTeamsError(null);
      const token = await AsyncStorage.getItem("token");
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear  = now.getFullYear();
      const prevDate  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = prevDate.getMonth() + 1;
      const prevYear  = prevDate.getFullYear();
      const headers   = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      // Build view suffix — KPI endpoint uses branch_id / cluster
      let viewSuffix = '';
      if (vType === VIEW_LEVEL.BRANCH && sView) viewSuffix = `&branch_id=${sView.id}`;
      if (vType === VIEW_LEVEL.TEAM   && sView) viewSuffix = `&cluster=${sView.id}`;

      const [currentRes, prevRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/dashboard/kpi/teams?month=${currentMonth}&year=${currentYear}${viewSuffix}`, { headers, credentials: 'include' }),
        fetch(`${API_BASE_URL}/api/dashboard/kpi/teams?month=${prevMonth}&year=${prevYear}${viewSuffix}`,       { headers, credentials: 'include' }),
      ]);
      if (!currentRes.ok) throw new Error(`HTTP ${currentRes.status}`);
      if (!prevRes.ok)    throw new Error(`HTTP ${prevRes.status}`);
      const [currentResult, prevResult] = await Promise.all([currentRes.json(), prevRes.json()]);

      const calcPercentage = (payload) => {
        const branches = payload?.data || [];
        const totals = branches.reduce((acc, b) => {
          const bt = b.branch_totals || {};
          acc.collection += bt.collection ?? 0;
          acc.expected   += bt.expected   ?? 0;
          return acc;
        }, { collection: 0, expected: 0 });
        return totals.expected > 0 ? (totals.collection / totals.expected) * 100 : 0;
      };

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      if (isOk(currentResult) && currentResult.payload) {
        setKpiTeamsData({
          branches: currentResult.payload.data || [],
          grand_total_collection_percentage: calcPercentage(currentResult.payload),
          current_month_label: months[currentMonth - 1],
          prev_month_percentage: isOk(prevResult) && prevResult.payload
            ? calcPercentage(prevResult.payload) : null,
          prev_month_label: months[prevMonth - 1],
        });
      } else setKpiTeamsError(currentResult.error || 'Failed to fetch KPI data');
    } catch (err) { setKpiTeamsError(err.message || 'Network error'); }
    finally { setKpiTeamsLoading(false); }
  };

  const fetchCustomerSummary = async (vType = viewType, sView = selectedView) => {
    try {
      setCustomerLoading(true); setCustomerError(null);
      const token = await AsyncStorage.getItem("token");
      // POST body uses: branch_id / cluster_id
      const body = buildBody(vType, sView, 'branch_id', 'cluster_id');
      const response = await fetch(`${API_BASE_URL}/api/members/getpaginatedclients/1/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (isOk(result) && result.additional_data?.summary) setCustomerSummary(result.additional_data.summary);
      else setCustomerError(result.error || 'Failed to fetch customer summary');
    } catch (err) { setCustomerError(err.message || 'Network error.'); }
    finally { setCustomerLoading(false); }
  };

  const fetchLoansSummary = async (vType = viewType, sView = selectedView) => {
    try {
      setLoansLoading(true); setLoansError(null);
      const token = await AsyncStorage.getItem("token");
      // POST body uses: branch / cluster
      const body = buildBody(vType, sView, 'branch', 'cluster');
      const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedloans/1/1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (isOk(result) && result.additional_data?.summary) setLoansSummary(result.additional_data.summary);
      else setLoansError(result.error || 'Failed to fetch loans summary');
    } catch (err) { setLoansError(err.message || 'Network error.'); }
    finally { setLoansLoading(false); }
  };

  const fetchInstallmentsSummary = async (vType = viewType, sView = selectedView) => {
    try {
      setInstallmentsLoading(true); setInstallmentsError(null);
      const token = await AsyncStorage.getItem("token");
      // QS uses: branch / cluster
      const qs = buildQS(vType, sView, 'branch', 'cluster');
      const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedinstallments/1/1${qs}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (isOk(result) && result.additional_data?.summary) setInstallmentsSummary(result.additional_data.summary);
      else setInstallmentsError(result.error || 'Failed to fetch installments summary');
    } catch (err) { setInstallmentsError(err.message || 'Network error.'); }
    finally { setInstallmentsLoading(false); }
  };

  const fetchPaymentsSummary = async (vType = viewType, sView = selectedView) => {
    try {
      setPaymentsLoading(true); setPaymentsError(null);
      const token = await AsyncStorage.getItem("token");
      // QS uses: branch / cluster
      const qs = buildQS(vType, sView, 'branch', 'cluster');
      const response = await fetch(`${API_BASE_URL}/api/loans/getpaginatedpayments/1/1${qs}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (isOk(result) && result.additional_data?.summary) setPaymentsSummary(result.additional_data.summary);
      else setPaymentsError(result.error || 'Failed to fetch payments summary');
    } catch (err) { setPaymentsError(err.message || 'Network error.'); }
    finally { setPaymentsLoading(false); }
  };

  const fetchCollections = async (vType = viewType, sView = selectedView, dFilter = dateFilter) => {
    try {
      setCollectionsLoading(true); setCollectionsError(null);
      const token = await AsyncStorage.getItem("token");
      // QS uses: branch_id / cluster
      let qs = `period=${dFilter || 'mtd'}`;
      if (vType === VIEW_LEVEL.BRANCH && sView) qs += `&branch_id=${sView.id}`;
      if (vType === VIEW_LEVEL.TEAM   && sView) qs += `&cluster=${sView.id}`;
      const response = await fetch(`${API_BASE_URL}/api/collections?${qs}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (isOk(result) && result.payload) setCollectionsData(result.payload);
      else setCollectionsError(result.error || 'Failed to fetch collections');
    } catch (err) { setCollectionsError(err.message || 'Network error.'); }
    finally { setCollectionsLoading(false); }
  };

  const fetchDisbursements = async (vType = viewType, sView = selectedView, dFilter = dateFilter) => {
    try {
      setDisbursementsLoading(true); setDisbursementsError(null);
      const token = await AsyncStorage.getItem("token");
      // QS uses: branch_id / cluster
      let qs = `period=${dFilter || 'mtd'}`;
      if (vType === VIEW_LEVEL.BRANCH && sView) qs += `&branch_id=${sView.id}`;
      if (vType === VIEW_LEVEL.TEAM   && sView) qs += `&cluster=${sView.id}`;
      const response = await fetch(`${API_BASE_URL}/api/disbursements?${qs}`, {
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (isOk(result) && result.payload) setDisbursementsData(result.payload);
      else setDisbursementsError(result.error || 'Failed to fetch disbursements');
    } catch (err) { setDisbursementsError(err.message || 'Network error.'); }
    finally { setDisbursementsLoading(false); }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // HELPERS & RENDER
  // ────────────────────────────────────────────────────────────────────────────

  const calculateTotal = (groupedData) => {
    if (!groupedData) return 0;
    let total = 0;
    Object.values(groupedData).forEach(items => {
      if (Array.isArray(items)) items.forEach(item => { total += parseFloat(item.amount || 0); });
    });
    return Math.round(total);
  };

  const handleProfilePress = async () => {
    try {
      const cached = await AsyncStorage.getItem('cachedFullProfile');
      if (cached) {
        const user = JSON.parse(cached);
        const userId = user?.id || user?.user_id;
        if (userId) {
          router.push({ pathname: '/userProfile', params: { userId } });
          return;
        }
      }
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/users/currentUser`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json();
      const candidate = Array.isArray(data?.payload) ? data.payload[0] : data?.payload;
      if (candidate?.id) {
        router.push({ pathname: '/userProfile', params: { userId: candidate.id } });
      }
    } catch (err) {
      console.error('[handleProfilePress] error:', err);
    }
  };

  const renderIDRCard = () => {
    if (loading) return <LoadingCard icon="trending-down" title="Installments Default Rate (IDR)" />;
    if (error)   return <ErrorCard icon="trending-down" title="Installments Default Rate (IDR)" message={error} onRetry={() => fetchIDRData(viewType, selectedView)} />;
    if (!idrData) return <EmptyCard icon="trending-down" title="Installments Default Rate (IDR)" />;
    const getProgressColor = (pct) => pct >= 30 ? '#FF4444' : pct >= 20 ? '#FF9800' : '#00C853';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="trending-down" size={18} color={ACCENT} />
          <Text style={styles.cardTitle}>Installments Default Rate (IDR)</Text>
        </View>
        {[['1 Month', idrData.one_month], ['3 Months', idrData.three_month], ['Overall', idrData.overall]].map(([label, data]) => {
          const pct   = data?.par_percentage || 0;
          const color = getProgressColor(pct);
          return (
            <React.Fragment key={label}>
              <View style={styles.rateItem}>
                <Text style={styles.rateLabel}>{label}</Text>
                <Text style={[styles.rateValue, { color }]}>{pct.toFixed(2)}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
              </View>
            </React.Fragment>
          );
        })}
      </View>
    );
  };

  const renderBusinessUnitCard = () => {
    if (cashBalanceLoading) return <LoadingCard icon="briefcase-outline" title="Business Unit (BU)" />;
    if (cashBalanceError)   return <ErrorCard icon="briefcase-outline" title="Business Unit (BU)" message={cashBalanceError} onRetry={() => fetchCashBalance(viewType, selectedView)} />;
    if (!cashBalanceData)   return <EmptyCard icon="briefcase-outline" title="Business Unit (BU)" />;
    const totalExpenses    = Object.values(cashBalanceData).flat().reduce((a, i) => a + (i.expenses || 0), 0);
    const totalCashBalance = Object.values(cashBalanceData).flat().reduce((a, i) => a + (i.amount  || 0), 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="briefcase-outline" size={18} color={ACCENT} />
          <Text style={styles.cardTitle}>Business Unit (BU)</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: '#FFE0B2', borderColor: '#FF6F00' }]}>
            <Text style={[styles.summaryValue, { color: '#E65100' }]}>{(totalExpenses||0).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Expenses</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: '#E8F5E9', borderColor: '#00C853' }]}>
            <Text style={[styles.summaryValue, { color: '#00C853' }]}>{(totalCashBalance||0).toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>Cash Balance</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCollectionsDisbursementsCards = () => {
    const collectionsTotal   = calculateTotal(collectionsData);
    const disbursementsTotal = calculateTotal(disbursementsData);
    const filterLabel = dateFilter === 'today' ? 'Today' : dateFilter === 'wtd' ? 'WTD' : 'MTD';
    return (
      <View style={styles.updatesSection}>
        <View style={styles.updateCardsContainer}>
          {/* Collections */}
          <View style={[styles.updateCard, { backgroundColor: '#4CAF50' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              {kpiTeamsLoading
                ? <ActivityIndicator size="small" color="white" />
                : kpiTeamsData
                  ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {kpiTeamsData.prev_month_percentage !== null && (
                        <View style={[styles.collectionRateBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                          <Text style={styles.collectionRateText}>{(kpiTeamsData.prev_month_percentage||0).toFixed(1)}%</Text>
                          <Text style={styles.collectionRateLabel}>{kpiTeamsData.prev_month_label}</Text>
                        </View>
                      )}
                      <View style={styles.collectionRateBadge}>
                        <Text style={styles.collectionRateText}>{(kpiTeamsData.grand_total_collection_percentage||0).toFixed(1)}%</Text>
                        <Text style={styles.collectionRateLabel}>{kpiTeamsData.current_month_label}</Text>
                      </View>
                    </View>
                  ) : null}
            </View>
            <Text style={styles.updateCardTitle}>Collections</Text>
            {collectionsLoading
              ? <ActivityIndicator size="small" color="white" style={styles.updateCardLoader} />
              : collectionsError
                ? <Text style={styles.updateCardError}>Error</Text>
                : <Text style={styles.updateCardValue}>{collectionsTotal.toLocaleString()}</Text>}
            <TouchableOpacity style={[styles.updateCardFooter, { backgroundColor: '#66BB6A' }]} onPress={() => setShowFilterMenu(!showFilterMenu)}>
              <Ionicons name="calendar" size={14} color="white" />
              <Text style={styles.updateCardFooterText}>{filterLabel}</Text>
              <Ionicons name="chevron-down" size={14} color="white" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Disbursements */}
          <View style={[styles.updateCard, { backgroundColor: '#2196F3' }]}>
            <View style={[styles.updateCardIconContainer, { backgroundColor: '#42A5F5' }]}>
              <Ionicons name="trending-down" size={22} color="white" />
            </View>
            <Text style={styles.updateCardTitle}>Disbursements</Text>
            {disbursementsLoading
              ? <ActivityIndicator size="small" color="white" style={styles.updateCardLoader} />
              : disbursementsError
                ? <Text style={styles.updateCardError}>Error</Text>
                : <Text style={styles.updateCardValue}>{disbursementsTotal.toLocaleString()}</Text>}
            <TouchableOpacity style={[styles.updateCardFooter, { backgroundColor: '#42A5F5' }]} onPress={() => setShowFilterMenu(!showFilterMenu)}>
              <Ionicons name="calendar" size={14} color="white" />
              <Text style={styles.updateCardFooterText}>{filterLabel}</Text>
              <Ionicons name="chevron-down" size={14} color="white" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>

        {showFilterMenu && (
          <View style={styles.filterMenu}>
            {[['today','Today'],['wtd','Week to Date'],['mtd','Month to Date']].map(([val, label]) => (
              <TouchableOpacity key={val}
                style={[styles.filterOption, dateFilter === val && styles.filterOptionActive]}
                onPress={() => { setDateFilter(val); setShowFilterMenu(false); }}>
                <Text style={[styles.filterOptionText, dateFilter === val && styles.filterOptionTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderStatsSummaryCard = () => {
    const isAnyLoading = customerLoading || loansLoading || installmentsLoading || paymentsLoading;
    const hasAnyError  = customerError  || loansError  || installmentsError  || paymentsError;
    if (isAnyLoading) return <LoadingCard icon="stats-chart-outline" title="Summary" />;
    if (hasAnyError) return (
      <ErrorCard icon="stats-chart-outline" title="Summary Statistics"
        message={customerError || loansError || installmentsError || paymentsError}
        onRetry={() => {
          fetchCustomerSummary(viewType, selectedView);
          fetchLoansSummary(viewType, selectedView);
          fetchInstallmentsSummary(viewType, selectedView);
          fetchPaymentsSummary(viewType, selectedView);
        }} />
    );
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="stats-chart-outline" size={18} color={ACCENT} />
          <Text style={styles.cardTitle}>Summary Statistics</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: '#F5F5F5', borderColor: '#BDBDBD' }]}>
            <Text style={[styles.summaryValue, { color: '#424242' }]}>{customerSummary?.total_no_of_clients || 0}</Text>
            <Text style={styles.summaryLabel}>Total Customers</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: '#E8F5E9', borderColor: '#00C853' }]}>
            <Text style={[styles.summaryValue, { color: '#00C853' }]}>{customerSummary?.total_active || 0}</Text>
            <Text style={styles.summaryLabel}>Total Clients</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: '#E3F2FD', borderColor: ACCENT }]}>
            <Text style={[styles.summaryValue, { color: ACCENT }]}>{loansSummary?.total_no_of_loans || 0}</Text>
            <Text style={styles.summaryLabel}>Total Loans</Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: '#FFF9E6', borderColor: '#FFA000' }]}>
            <Text style={[styles.summaryValue, { color: '#FFA000' }]}>{installmentsSummary?.total_no_of_installments || 0}</Text>
            <Text style={styles.summaryLabel}>Total Installments</Text>
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: '#E8F5E9', borderColor: '#00C853', flex: 1 }]}>
            <Text style={[styles.summaryValue, { color: '#00C853' }]}>{paymentsSummary?.total_no_of_payments || 0}</Text>
            <Text style={styles.summaryLabel}>Total Payments</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 8 }} />
        </View>
      </View>
    );
  };

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ACCENT]} />}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <Text style={styles.dateLabel}>Date</Text>
              <Text style={styles.dateValue}>{currentDate}</Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
              <View style={styles.profileIcon}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.headerBottom}>
            <View style={styles.currentViewContainer}>
              <Text style={styles.switchViewLabel}>
                {canSwitchView ? 'Switch View' : 'Current View'}
              </Text>
              <TouchableOpacity style={styles.currentViewBox} onPress={handleViewButtonPress} activeOpacity={0.7}>
                <Ionicons name={viewIcon} size={14} color={ACCENT} style={styles.currentViewIcon} />
                <View style={styles.currentViewTextContainer}>
                  <Text style={styles.currentViewLabel}>
                    {viewLevel === null ? 'Loading…' : canSwitchView ? 'Current View:' : 'Your View:'}
                  </Text>
                  <Text style={styles.currentViewValue} numberOfLines={1}>
                    {viewLevel === null ? '—' : getViewLabel()}
                  </Text>
                </View>
                {canSwitchView  && <Ionicons name="chevron-down"       size={14} color={ACCENT} />}
                {!canSwitchView && <Ionicons name="lock-closed-outline" size={13} color={ACCENT} style={{ opacity: 0.5 }} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.actionsButton} onPress={() => router.push('/actions')}>
              <Text style={styles.actionsButtonText}>Actions</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {renderIDRCard()}
        {renderBusinessUnitCard()}
        {renderCollectionsDisbursementsCards()}
        {renderStatsSummaryCard()}

        <TouchableOpacity style={styles.bottomActionsButton} onPress={() => router.push('/actions')}>
          <Text style={styles.actionsButtonText}>Actions</Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
}

// ── Shared card helpers ───────────────────────────────────────────────────────
function LoadingCard({ icon, title }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={ACCENT} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    </View>
  );
}

function ErrorCard({ icon, title, message, onRetry }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={ACCENT} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={40} color="#FF4444" />
        <Text style={styles.errorText}>{message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function EmptyCard({ icon, title }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={ACCENT} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={styles.noDataText}>No data available</Text>
    </View>
  );
}

// ── Styles (unchanged) ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F5F5F5' },
  scrollView: { flex: 1 },
  header:     { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, backgroundColor: '#fff', marginTop: 12 },
  headerTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerLeft: { flex: 1 },
  dateLabel:  { fontSize: 11, color: '#757575', marginBottom: 2 },
  dateValue:  { fontSize: 12, color: '#212121', fontWeight: '500' },
  profileButton: { padding: 2 },
  profileIcon:   { width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center' },
  headerBottom:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  currentViewContainer: { flex: 1, marginRight: 12 },
  switchViewLabel: { fontSize: 11, color: '#757575', marginBottom: 4, fontWeight: '500' },
  currentViewBox: { backgroundColor: '#E3F2FD', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: ACCENT },
  currentViewIcon: { marginRight: 6 },
  currentViewTextContainer: { flex: 1 },
  currentViewLabel: { fontSize: 9, color: '#757575', marginBottom: 1 },
  currentViewValue: { fontSize: 11, color: ACCENT, fontWeight: '600' },
  actionsButton: { backgroundColor: ACCENT, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 6 },
  actionsButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginRight: 4 },
  bottomActionsButton: { backgroundColor: ACCENT, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, marginHorizontal: 16, marginTop: 4, marginBottom: 16, borderRadius: 8 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  cardTitle:  { fontSize: 13, fontWeight: '600', color: '#212121', marginLeft: 8 },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText:      { marginTop: 12, fontSize: 13, color: '#757575' },
  errorContainer:   { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  errorText:        { marginTop: 12, fontSize: 13, color: '#FF4444', textAlign: 'center', marginBottom: 16 },
  retryButton:      { backgroundColor: ACCENT, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 6 },
  retryButtonText:  { color: '#fff', fontSize: 14, fontWeight: '600' },
  noDataText:       { fontSize: 13, color: '#757575', textAlign: 'center', paddingVertical: 20 },
  rateItem:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  rateLabel:    { fontSize: 13, color: '#616161' },
  rateValue:    { fontSize: 14, fontWeight: '600' },
  progressBar:  { height: 6, backgroundColor: '#EEEEEE', borderRadius: 3, marginBottom: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryBox: { flex: 1, alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12, marginHorizontal: 4, borderRadius: 8, borderWidth: 1.5 },
  summaryValue: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: '#757575', textAlign: 'center', fontWeight: '500' },
  updatesSection:       { paddingHorizontal: 16, marginBottom: 12, marginTop: 12 },
  updateCardsContainer: { flexDirection: 'row', gap: 12 },
  updateCard:           { flex: 1, borderRadius: 16, padding: 16, minHeight: 140, justifyContent: 'space-between' },
  updateCardIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  updateCardTitle:  { fontSize: 13, color: 'white', fontWeight: '500', marginBottom: 8 },
  updateCardValue:  { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 12 },
  updateCardLoader: { marginBottom: 12, alignSelf: 'flex-start' },
  updateCardError:  { fontSize: 14, color: 'white', marginBottom: 12, opacity: 0.8 },
  updateCardFooter: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  updateCardFooterText: { fontSize: 12, color: 'white', marginLeft: 6, fontWeight: '600' },
  filterMenu: { backgroundColor: 'white', borderRadius: 12, marginTop: 12, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  filterOption:           { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  filterOptionActive:     { backgroundColor: '#E3F2FD' },
  filterOptionText:       { fontSize: 14, color: '#666666', fontWeight: '500' },
  filterOptionTextActive: { color: ACCENT, fontWeight: '600' },
  collectionRateBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  collectionRateText:  { fontSize: 16, fontWeight: '700', color: 'white' },
  collectionRateLabel: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '500', marginTop: 1 },
  bottomPadding: { height: 20 },
});