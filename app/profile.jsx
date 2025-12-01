import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;



const Profile = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('All Instalments');
  const [customer, setCustomer] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedBDE, setSelectedBDE] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showBDEDropdown, setShowBDEDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [assessModalVisible, setAssessModalVisible] = useState(false);
  const [assessmentData, setAssessmentData] = useState({
    surname: '',
    other_names: '',
    phone: '',
    marketing_type: '',
    business_nature: '',
    business_premise_type: '',
    stock_type: '',
    stock_level: '',
    interest_level: '',
    personal_character: '',
    owns_business: '',
    business_legitimacy: '',
    loan_purpose: '',
    business_types: ['']
  });
  const [dropdownStates, setDropdownStates] = useState({
    marketing_type: false,
    stock_type: false,
    stock_level: false,
    interest_level: false,
    personal_character: false,
    owns_business: false,
    business_legitimacy: false
  });
  const [businessTypeOptions, setBusinessTypeOptions] = useState([]);
  const [filteredBusinessTypes, setFilteredBusinessTypes] = useState([]);
  const [showBusinessTypeSuggestions, setShowBusinessTypeSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(''); // For radio buttons
  const [loadingBusinessTypes, setLoadingBusinessTypes] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [assessmentDetails, setAssessmentDetails] = useState(null);
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentReceivedBy, setPaymentReceivedBy] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [transactionType, setTransactionType] = useState('');
  const [allocatedPayments, setAllocatedPayments] = useState([{ type: '', amount: '' }]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [loans, setLoans] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [loadingDisbursements, setLoadingDisbursements] = useState(false);
  const [disbursementPage, setDisbursementPage] = useState(1);
  const [disbursementTotal, setDisbursementTotal] = useState(0);
  const [bmApprovalModalVisible, setBmApprovalModalVisible] = useState(false);
  const [hqApprovalModalVisible, setHqApprovalModalVisible] = useState(false);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [approvingBM, setApprovingBM] = useState(false);
  const [approvingHQ, setApprovingHQ] = useState(false);
  const [isMembershipFeePayment, setIsMembershipFeePayment] = useState(false);
  const [activeAllocationDropdown, setActiveAllocationDropdown] = useState(null);
  const [validBusinessTypes, setValidBusinessTypes] = useState([]);
  const [loanLimitModalVisible, setLoanLimitModalVisible] = useState(false);
  const [loanLimitData, setLoanLimitData] = useState(null);
  const [loadingLoanLimit, setLoadingLoanLimit] = useState(false);
  const [newLoanLimit, setNewLoanLimit] = useState('');
  const [showBalanceDueToday, setShowBalanceDueToday] = useState(false);
  const [amntBalForTopup, setAmntBalForTopup] = useState(0);
  const [cumulativeTotals, setCumulativeTotals] = useState({
  totalPrincipal: 0,
  totalRepayable: 0,
  totalPaid: 0,
  totalBalance: 0,
  totalDueToday: 0
});
const [requiredPaymentForTopup, setRequiredPaymentForTopup] = useState(0);
const [availableCredit, setAvailableCredit] = useState(0);
const [activeLoansCount, setActiveLoansCount] = useState(0);

  

  const addAllocation = () => {
    setAllocatedPayments([...allocatedPayments, { type: '', amount: '' }]);
  };

  const updateAllocation = (index, field, value) => {
  console.log('=== UPDATE ALLOCATION ===');
  console.log('Index:', index);
  console.log('Field:', field);
  console.log('Value:', value);
  
  setAllocatedPayments(prev => {
    const updated = prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    
    console.log('Updated allocation:', updated[index]);
    console.log('All allocations:', updated);
    
    return updated;
  });
  
  // Update totals separately to avoid stale state
  if (field === 'amount') {
    const newAllocations = allocatedPayments.map((item, i) => 
      i === index ? { ...item, amount: value } : item
    );
    const allocated = newAllocations.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    setTotalAllocated(allocated);
    setTotalBalance((parseFloat(paymentAmount) || 0) - allocated);
  }
};
    
  const navigation = useNavigation();
  const route = useRoute();
  const memberId = route.params?.memberId; 

  // Function to get button text based on status
 const getButtonText = (status) => {
  const buttonTextMap = {
    'Pending Allocation': 'Allocate',
    'Pending Assessment': 'Assess',
    'Pending Approval': 'Approve Assessment',
    'Pending Onboarding': 'Onboard',
    'Pending BM Approval': 'BM Approval',
    'Pending HQ Approval': 'HQ Approval',
    'Pending Appraisal': 'Appraise',              // ✅ Added
    'Pending Appraisal (BM)': 'Approve Appraisal', // ✅ Added
    'Pending Appraisal (HQ)': 'Approve Appraisal', // ✅ Added
    'Pending RF': 'Receive RF',
    'Dormant': 'Create Loan',
    'Active': 'Create Loan',
  };
  return buttonTextMap[status] || status;
};

  // Function to handle status button actions
  const handleStatusAction = () => {
  if (customer.status === 'Pending Allocation') {
    openAllocateModal();
  } else if (customer.status === 'Pending Assessment') {
    openAssessModal();
  } else if (customer.status === 'Pending Approval') {
    openApproveModal();
  } else if (customer.status === 'Pending Onboarding') {
    handleOnboard();
  } else if (customer.status === 'Pending BM Approval') {
    setBmApprovalModalVisible(true);
  } else if (customer.status === 'Pending HQ Approval') {
    setHqApprovalModalVisible(true);
  } else if (customer.status === 'Pending RF') {
    setIsMembershipFeePayment(true);
    setPaymentModalVisible(true);
  } else if (customer.status === 'Dormant' || customer.status === 'Active') {
    router.push(`/create_loan?client_id=${memberId}`);
  } else {
    Alert.alert('Action', `Perform action for status: ${customer.status}`);
  }
};

  // Fetch customer profile data
  useEffect(() => {
    if (memberId) {
      fetchCustomerProfile();
      //fetchLoans();
      fetchLoanSummaryData();
      fetchDisbursements();
    } else {
      setError('No member ID provided');
      setLoading(false);
    }
  }, [memberId]);

  //fetch current user
  useEffect(() => {
  const fetchCurrentUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No token found');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const json = await response.json();
      console.log('Fetched user response:', json); // 👀 See full shape

      if (response.ok && json.status === 'success' && json.data?.user) {
        setCurrentUser(json.data.user); // ✅ Now sets the real user object
      } else {
        console.warn('Failed to load user:', json);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  if (paymentModalVisible) {
    fetchCurrentUser();
  }
}, [paymentModalVisible]);

// Reset membership fee flag when modal closes
  useEffect(() => {
    if (!paymentModalVisible) {
      setIsMembershipFeePayment(false);
      setTransactionType('');
      setPaymentAmount('');
      setPaymentReference('');
      setAllocatedPayments([{ type: '', amount: '' }]);
    }
  }, [paymentModalVisible]);



  const fetchCustomerProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      console.log('Fetching client for memberId:', memberId);
      console.log('API URL:', `${API_BASE_URL}/api/clients/${memberId}`);

      const response = await fetch(
        `${API_BASE_URL}/api/clients/${memberId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      // console.log('Raw client status from API:', data.client.status);
      // console.log('Full client data:', JSON.stringify(data.client, null, 2));
      
      
      if (!data.client) {
        throw new Error('Client not found');
      }

      
      const mappedCustomer = {
        name: data.client.name || 'N/A',
        phone: data.client.phone || 'N/A',
        team: data.teams && data.teams.length > 0 ? data.teams[0].name : 'Not Assigned',
        branch: data.teams && data.teams[0]?.branch?.name ? data.teams[0].branch.name : 'N/A',
        status: (() => {
          const statusMap = {
            0: 'Pending Allocation',
            1: 'Pending Assessment',
            2: 'Pending Approval',
            3: 'Pending Onboarding',
            4: 'Pending BM Approval',
            5: 'Pending HQ Approval',
            6: 'Pending Appraisal',              
            7: 'Pending Appraisal (BM)',         
            8: 'Pending Appraisal (HQ)',         
            9: 'Pending RF',
            10: 'Dormant',                       
            11: 'Active',                        
            '-1': 'Rejected Lead',
            '-2': 'Rejected Client',
            '-3': 'Rejected Appraisal',
            '-4': 'Blacklisted',
          };
          return statusMap[data.client.status] || 'Unknown Status';
        })(),
        loans: {
          noOfLoans: data.client.loan_count || data.client.no_of_loans || 0,
          loanLimit: data.client.loan_limit 
            ? `Ksh ${data.client.loan_limit} per product` 
            : 'Ksh 0 per product',
          loanLimitApproved: data.client.approved_loan_limit 
            ? `Ksh ${data.client.approved_loan_limit} per product` 
            : 'Ksh 0 per product',
          loanPrincipal: data.client.loan_principal 
            ? `Ksh ${data.client.loan_principal}` 
            : '-',
          // dateDisbursed: data.client.date_disbursed || 
          //                data.client.disbursement_date || '-',
          // loanDueDate: data.client.loan_due_date || 
          //              data.client.due_date || '-',
          // repayableAmount: data.client.repayable_amount 
          //   ? `Ksh ${data.client.repayable_amount}` 
          //   : '-',
          // totalPaid: data.client.total_paid 
          //   ? `Ksh ${data.client.total_paid}` 
          //   : '-',
          // totalBalance: data.client.total_balance || 
          //               data.client.balance 
          //   ? `Ksh ${data.client.total_balance || data.client.balance}` 
          //   : '-',
          // balanceDueToday: data.client.balance_due_today 
          //   ? `Ksh ${data.client.balance_due_today}` 
          //   : '-',
          // availableTopUp: data.client.available_topup || 
          //                 data.client.topup_amount 
          //   ? `Ksh ${data.client.available_topup || data.client.topup_amount}` 
          //   : '-',
        },
        
        rawData: data.client,
      };
      // console.log('Mapped customer status:', mappedCustomer.status);

      setCustomer(mappedCustomer);
      
      // Set teams for dropdown
      // if (data.teams && Array.isArray(data.teams)) {
      //   const teamNames = data.teams.map(team => 
      //     typeof team === 'string' ? team : (team.name || team.team_name || team)
      //   );
      //   setTeams(teamNames);
      // }
      // In fetchCustomerProfile, replace lines ~223-228 with:
      if (data.teams && Array.isArray(data.teams)) {
        setTeams(data.teams); // ✅ Store the full team objects
      }
      
      // Set users for BDE dropdown
      if (data.users && Array.isArray(data.users)) {
        setUsers(data.users);
      }

      // Set products if needed
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products);
      }

    } catch (err) {
      setError(err.message);
      Alert.alert('Error', `Failed to load customer profile: ${err.message}`);
      console.error('Error fetching customer profile:', err);
    } finally {
      setLoading(false);
    }
  };

//   const fetchLoans = async () => {
//   try {
//     setLoadingLoans(true);
//     const token = await AsyncStorage.getItem('token');
    
//     if (!token) {
//       throw new Error('No token found');
//     }

//     const response = await fetch(
//       `${API_BASE_URL}/api/loans/all/${memberId}`,
//       {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`,
//         },
//       }
//     );

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();
//     console.log("Loans payload:", data.payload);

    
//     if (data.success && data.payload) {
//       setLoans(data.payload);
//     } else {
//       setLoans([]);
//     }
    
//   } catch (err) {
//     console.error('Error fetching loans:', err);
//     Alert.alert('Error', `Failed to load loans: ${err.message}`);
//   } finally {
//     setLoadingLoans(false);
//   }
// };

 const fetchLoanLimit = async () => {
  try {
    setLoadingLoanLimit(true);
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/clients/${memberId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Loan Limit Data:', data);
    
    // Check if we have client data
    if (data.client) {
      setLoanLimitData({
        systemLimit: data.client.loan_limit,
        approvedLimit: data.client.approved_loan_limit,
      });
      setLoanLimitModalVisible(true);
    }
    
  } catch (err) {
    console.error('Error fetching loan limit:', err);
    Alert.alert('Error', `Failed to load loan limit: ${err.message}`);
  } finally {
    setLoadingLoanLimit(false);
  }
};
  const handleSetNewLimit = async () => {
    try {
      if (!newLoanLimit || parseFloat(newLoanLimit) <= 0) {
        Alert.alert('Error', 'Please enter a valid loan limit');
        return;
      }

      setLoadingLoanLimit(true);
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        throw new Error('No token found');
      }

      // ✅ Use FormData instead of JSON
      const formData = new FormData();
      formData.append('amount', newLoanLimit);

      const response = await fetch(
        `${API_BASE_URL}/api/clients/${memberId}/limit`,
        {
          method: 'POST',
          headers: {
            // ✅ Remove Content-Type header when using FormData
            'Authorization': `Bearer ${token}`,
          },
          body: formData,  // ✅ Send FormData
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Set Loan Limit Response:', data);
      
      if (data.success) {
        Alert.alert('Success', data.message || 'Loan limit updated successfully');
        setLoanLimitModalVisible(false);
        setNewLoanLimit('');
        
        // Refresh customer profile to get updated data
        await fetchCustomerProfile();
      } else {
        Alert.alert('Error', data.error || 'Failed to update loan limit');
      }
      
    } catch (err) {
      console.error('Error setting loan limit:', err);
      Alert.alert('Error', `Failed to update loan limit: ${err.message}`);
    } finally {
      setLoadingLoanLimit(false);
    }
  };

const fetchDisbursements = async (page = 1) => {
  try {
    setLoadingDisbursements(true);
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/disbursements/${memberId}?page=${page}&per_page=5`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.payload) {
      setDisbursements(data.payload);
      setDisbursementTotal(data.pagination?.total || 0);
      setDisbursementPage(page);
    } else {
      setDisbursements([]);
    }
    
  } catch (err) {
    console.error('Error fetching disbursements:', err);
    Alert.alert('Error', `Failed to load disbursements: ${err.message}`);
  } finally {
    setLoadingDisbursements(false);
  }
};
const fetchLoanSummaryData = async () => {
  try {
    setLoadingLoans(true);
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(
      `${API_BASE_URL}/api/loans/client-summary-with-calculations/${memberId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Loan Summary Data:", data);

    if (data.success && data.payload) {
      // Set all the state from one API call
      setCumulativeTotals(data.payload.cumulative_totals || {
        totalPrincipal: 0,
        totalRepayable: 0,
        totalPaid: 0,
        totalBalance: 0,
        totalDueToday: 0
      });
      setRequiredPaymentForTopup(data.payload.required_payment_for_topup || 0);
      setAvailableCredit(data.payload.available_credit || 0);
      setActiveLoansCount(data.payload.active_loans_count || 0);
      setLoans(data.payload.all_loans || []);
    }
    
  } catch (err) {
    console.error('Error fetching loan summary:', err);
    Alert.alert('Error', `Failed to load loan summary: ${err.message}`);
  } finally {
    setLoadingLoans(false);
  }
};

//  const calculateLoanSummary = () => {
//   if (!loans || loans.length === 0) {
//     return {
//       noOfLoans: 0,
//       loanLimit: 'Ksh 0 per product',
//       loanPrincipal: 'Ksh 0',
//       dateDisbursed: '-',
//       loanDueDate: '-',
//       repayableAmount: 'Ksh 0',
//       totalPaid: 'Ksh 0',
//       totalBalance: 'Ksh 0',
//       balanceDueToday: 'Ksh 0',
//       availableTopUp: 'Ksh 0',
//     };
//   }

//   const totalPrincipal = loans.reduce((sum, loan) => sum + (loan.amount || 0), 0);
//   const totalBalance = loans.reduce((sum, loan) => sum + (loan.il_balance_due || loan.outstanding_balance || 0), 0);
//   const totalPaid = loans.reduce((sum, loan) => sum + (loan.total_amount_paid || 0), 0);
//   const totalRepayable = loans.reduce((sum, loan) => sum + (loan.repayable_amount || 0), 0);

//   const disbursedLoans = loans.filter(loan => loan.disbursed_at);
//   const latestDisbursement = disbursedLoans.length > 0
//     ? new Date(Math.max(...disbursedLoans.map(loan => new Date(loan.disbursed_at))))
//     : null;

//   const loansWithDueDate = loans.filter(loan => loan.next_due_date);
//   const nearestDueDate = loansWithDueDate.length > 0
//     ? new Date(Math.min(...loansWithDueDate.map(loan => new Date(loan.next_due_date))))
//     : null;

//   const balanceDueToday = loans.reduce((sum, loan) => sum + (loan.amount_due_today || 0), 0);

//   return {
//     noOfLoans: loans.length,
//     loanLimit: customer?.loans?.loanLimit || 'Ksh 0 per product',
//     loanPrincipal: `Ksh ${totalPrincipal.toLocaleString()}`,
//     dateDisbursed: latestDisbursement ? latestDisbursement.toLocaleDateString() : '-',
//     loanDueDate: nearestDueDate ? nearestDueDate.toLocaleDateString() : '-',
//     repayableAmount: `Ksh ${totalRepayable.toLocaleString()}`,
//     totalPaid: `Ksh ${totalPaid.toLocaleString()}`,
//     totalBalance: `Ksh ${totalBalance.toLocaleString()}`,
//     balanceDueToday: ` ${Math.round(balanceDueToday).toLocaleString()}`,
//     availableTopUp: customer?.loans?.availableTopUp || 'Ksh 0',
//   };
// };



  // const handleAllocate = async () => {
  //   try {
  //     const token = await AsyncStorage.getItem('token');

  //   console.log('=== ALLOCATION REQUEST ===');
  //   console.log('Selected Team:', selectedTeam);
  //   console.log('Selected BDE:', selectedBDE);
    
  //   // Use FormData to match your backend expectation
  //   const formData = new FormData();
  //   formData.append('team_id', selectedTeam);
    
  //   // ONLY append bde_id if it's actually selected
  //   if (selectedBDE && selectedBDE.trim() !== '') {
  //     formData.append('bde_id', selectedBDE);
  //     console.log('Adding bde_id to request:', selectedBDE);
  //   } else {
  //     console.log('No BDE selected, not sending bde_id');
  //   }
      
  //     const response = await fetch(
  //       `${API_BASE_URL}/api/clients/${memberId}/allocate`, 
  //       {
  //         method: 'POST',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           'Authorization': `Bearer ${token}`,
  //         },
  //         body: JSON.stringify({
  //           team_id: selectedTeam,
  //           bde_id: selectedBDE,
  //         }),
  //       }
  //     );

  //     if (!response.ok) {
  //       throw new Error('Failed to allocate customer');
  //     }

  //     const result = await response.json();

  //     // Update local state
  //     setCustomer({
  //       ...customer,
  //       status: 'Pending Assessment',
  //       team: selectedTeam,
  //     });
      
  //     setModalVisible(false);
  //     setSelectedTeam('');
  //     setSelectedBDE('');
      
  //     Alert.alert('Success', 'Customer allocated successfully');
      
  //   } catch (err) {
  //     Alert.alert('Error', `Failed to allocate customer: ${err.message}`);
  //     console.error('Error allocating customer:', err);
  //   }
  // };
const calculateLoanSummary = () => {
  if (!loans || loans.length === 0) {
    return {
      noOfLoans: 0,
      loanLimit: customer?.loans?.loanLimit || 'Ksh 0 per product',
      loanPrincipal: 'Ksh 0',
      dateDisbursed: '-',
      loanDueDate: '-',
      repayableAmount: 'Ksh 0',
      totalPaid: 'Ksh 0',
      totalBalance: 'Ksh 0',
      balanceDueToday: 'Ksh 0',
      amntBalForTopup: 'Ksh 0',
      availableTopUp: 'Ksh 0',
    };
  }

  // Get latest disbursement and nearest due date from loans
  const disbursedLoans = loans.filter(loan => loan.disbursed_at);
  const latestDisbursement = disbursedLoans.length > 0
    ? new Date(Math.max(...disbursedLoans.map(loan => new Date(loan.disbursed_at))))
    : null;

  const loansWithDueDate = loans.filter(loan => loan.next_due_date);
  const nearestDueDate = loansWithDueDate.length > 0
    ? new Date(Math.min(...loansWithDueDate.map(loan => new Date(loan.next_due_date))))
    : null;

  return {
    noOfLoans: activeLoansCount,
    loanLimit: customer?.loans?.loanLimit || 'Ksh 0 per product',
    loanPrincipal: `Ksh ${(cumulativeTotals.totalPrincipal || 0).toLocaleString()}`,
    dateDisbursed: latestDisbursement ? latestDisbursement.toLocaleDateString() : '-',
    loanDueDate: nearestDueDate ? nearestDueDate.toLocaleDateString() : '-',
    repayableAmount: `Ksh ${(cumulativeTotals.totalRepayable || 0).toLocaleString()}`,
    totalPaid: `Ksh ${(cumulativeTotals.totalPaid || 0).toLocaleString()}`,
    totalBalance: `Ksh ${(cumulativeTotals.totalBalance || 0).toLocaleString()}`,
    balanceDueToday: `${Math.round(cumulativeTotals.totalDueToday || 0).toLocaleString()}`,
    amntBalForTopup: `Ksh ${Math.round(requiredPaymentForTopup || 0).toLocaleString()}`, // ✅ NEW
    availableTopUp: `Ksh ${Math.round(availableCredit || 0).toLocaleString()}`, // ✅ UPDATED
  };
};
  const handleAllocate = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    console.log('=== ALLOCATION REQUEST ===');
    console.log('Selected Team Object:', selectedTeam);
    console.log('Selected BDE:', selectedBDE);
    
    // Extract team ID from the stored team object
    const teamId = typeof selectedTeam === 'object' && selectedTeam !== null
      ? selectedTeam.id
      : selectedTeam; // Fallback if it's just an ID
    
    console.log('Resolved Team ID:', teamId);
    console.log('Team ID type:', typeof teamId);
    
    // Validate we have proper ID
    if (!teamId) {
      Alert.alert('Error', 'Please select a valid team');
      return;
    }
    
    // Get BDE ID
    const selectedUser = users.find(user => {
      const userName = typeof user === 'string' 
        ? user 
        : (user.name || user.full_name || user.username);
      return userName === selectedBDE;
    });
    
    const bdeId = typeof selectedUser === 'string' 
      ? selectedUser 
      : (selectedUser?.id || selectedBDE);
    
    // Create FormData
    const formData = new FormData();
    formData.append('team_id', String(teamId)); // ✅ Now sending the integer ID
    
    if (bdeId) {
      formData.append('bde_id', String(bdeId));
    }
    
    console.log('FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    const response = await fetch(
      `${API_BASE_URL}/api/clients/${memberId}/allocate`, 
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const responseText = await response.text();
    console.log('Response:', responseText);
    
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {
        // Not JSON
      }
      throw new Error(errorMessage);
    }

    const result = JSON.parse(responseText);
    
    // Refresh to get updated data
    await fetchCustomerProfile();
    
    setModalVisible(false);
    setSelectedTeam('');
    setSelectedBDE('');
    
    Alert.alert('Success', 'Customer allocated successfully');
    
  } catch (err) {
    console.error('Error:', err.message);
    Alert.alert('Error', `Failed to allocate customer: ${err.message}`);
  }
};
  const fetchBusinessTypes = async () => {
  try {
    setLoadingBusinessTypes(true);
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(`${API_BASE_URL}/api/business-types`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) throw new Error('Failed to fetch business types');

    const data = await response.json();
    console.log('Raw API response (business types):', data);

    const businessTypes = data.business_types || data.data || data || [];
    console.log('businessTypes (after extraction):', businessTypes);

    // ✅ Normalize
    const normalizedBusinessTypes = businessTypes.map((bt) => ({
      business_class_id: bt.class_id || null,
      business_type_id: bt.id || null,
      business_type: bt.name || '',
      category: bt.description || '',
    }));

    console.log('validBusinessTypes (normalized):', normalizedBusinessTypes);

    setValidBusinessTypes(normalizedBusinessTypes);
    setBusinessTypeOptions(normalizedBusinessTypes.map(bt => bt.business_type));

  } catch (err) {
    console.error('Error fetching business types:', err);
  } finally {
    setLoadingBusinessTypes(false);
  }
};


  const openAllocateModal = () => {
    setModalVisible(true);
  };
  const openAssessModal = () => {
  // Auto-fill from customer data
  const nameParts = customer.name.split(' ');
  setAssessmentData({
    ...assessmentData,
    surname: nameParts[0] || '',
    other_names: nameParts.slice(1).join(' ') || '',
    phone: customer.phone || ''
  });
  fetchBusinessTypes();
  setAssessModalVisible(true);
};
//   const openApproveModal = () => {
//   // Use the already fetched customer data
//   if (customer && customer.rawData) {
//     const assessmentData = {
//       surname: customer.name?.split(' ')[0] || '',
//       other_names: customer.name?.split(' ').slice(1).join(' ') || '',
//       phone: customer.phone || '',
//       team: customer.team || '',
//       marketing_type: customer.rawData.marketing_type || '',
//       business_nature: customer.rawData.business_nature || '',
//       business_premise_type: customer.rawData.business_premise_type || '',
//       stock_type: customer.rawData.stock_type || '',
//       stock_level: customer.rawData.stock_level || '',
//       interest_level: customer.rawData.interest_level || '',
//       personal_character: customer.rawData.personal_character || '',
//       owns_business: customer.rawData.owns_business || '',
//       business_legitimacy: customer.rawData.business_legitimacy || '',
//       loan_purpose: customer.rawData.loan_purpose || '',
//       business_types: customer.rawData.business_types || [],
//       assessed_by: customer.rawData.assessed_by || '',
//       assessed_on: customer.rawData.assessed_date || customer.rawData.assessment_date || '',
//       assessed_at: customer.rawData.assessed_time || customer.rawData.assessment_time || '',
//     };
    
//     setAssessmentDetails(assessmentData);
//     setApproveModalVisible(true);
//   } else {
//     Alert.alert('Error', 'Customer data not available');
//   }
// };
const openApproveModal = () => {
  if (customer && customer.rawData) {
    
    let businessTypes = customer.rawData.business_types || [];
    
    
    if (customer.rawData.business_types_data) {
      if (typeof customer.rawData.business_types_data === 'string') {
        try {
          businessTypes = JSON.parse(customer.rawData.business_types_data);
        } catch (e) {
          console.error('Failed to parse business_types_data:', e);
          businessTypes = [];
        }
      } else if (Array.isArray(customer.rawData.business_types_data)) {
        businessTypes = customer.rawData.business_types_data;
      }
    }
    // Fallback to business_types if business_types_data doesn't exist
    else if (customer.rawData.business_types) {
      if (typeof customer.rawData.business_types === 'string') {
        try {
          businessTypes = JSON.parse(customer.rawData.business_types);
        } catch (e) {
          console.error('Failed to parse business_types:', e);
          businessTypes = [];
        }
      } else if (Array.isArray(customer.rawData.business_types)) {
        businessTypes = customer.rawData.business_types;
      }
    }

    const assessmentData = {
      surname: customer.name?.split(' ')[0] || '',
      other_names: customer.name?.split(' ').slice(1).join(' ') || '',
      phone: customer.phone || '',
      team: customer.team || '',
      marketing_type: customer.rawData.marketing_type || '',
      business_nature: customer.rawData.business_nature || '',
      business_premise_type: customer.rawData.business_premise_type || '',
      stock_type: customer.rawData.stock_type || '',
      stock_level: customer.rawData.stock_level || '',
      interest_level: customer.rawData.interest_level || '',
      personal_character: customer.rawData.personal_character || '',
      owns_business: customer.rawData.owns_business || '',
      business_legitimacy: customer.rawData.business_legitimacy || '',
      loan_purpose: customer.rawData.loan_purpose || '',
      business_types: businessTypes,
      category: customer.rawData.category || '', 
      assessed_by: customer.rawData.assessed_by || '',
      assessed_on: customer.rawData.assessed_date || customer.rawData.assessment_date || '',
      assessed_at: customer.rawData.assessed_time || customer.rawData.assessment_time || '',
    };
    
    console.log('Assessment Details:', assessmentData);
    console.log('Business Types:', businessTypes);
    console.log('Category:', assessmentData.category);
    
    setAssessmentDetails(assessmentData);
    setApproveModalVisible(true);
  } else {
    Alert.alert('Error', 'Customer data not available');
  }
};

const handleBusinessTypeSearch = (text, index) => {
  updateBusinessType(index, text);
  
  if (text.trim().length > 0) {
    const filtered = businessTypeOptions.filter(type =>
      type.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredBusinessTypes(filtered);
    setShowBusinessTypeSuggestions(filtered.length > 0);
  } else {
    setFilteredBusinessTypes([]);
    setShowBusinessTypeSuggestions(false);
  }
};

const selectBusinessType = (type, index) => {
  updateBusinessType(index, type);

  setShowBusinessTypeSuggestions(false);
  setFilteredBusinessTypes([]);
};

const handleAssessmentInputChange = (field, value) => {
  setAssessmentData({
    ...assessmentData,
    [field]: value
  });
};

const handleApproveAssessment = async () => {
  try {
    setLoadingApproval(true);
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(
      `${API_BASE_URL}/api/clients/${memberId}/initialassessment/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to approve assessment');
    }

    const result = await response.json();
    
    setCustomer({
      ...customer,
      status: 'Pending Onboarding', // Update to next status
    });
    
    setApproveModalVisible(false);
    Alert.alert('Success', 'Assessment approved successfully');
    
  } catch (err) {
    Alert.alert('Error', `Failed to approve assessment: ${err.message}`);
    console.error('Error approving assessment:', err);
  } finally {
    setLoadingApproval(false);
  }
};

const handleRejectAssessment = async () => {
  try {
    setLoadingApproval(true);
    const token = await AsyncStorage.getItem('token');
    
    const response = await fetch(
      `${API_BASE_URL}/api/clients/${memberId}/initialassessment/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to reject assessment');
    }

    const result = await response.json();
    
    setCustomer({
      ...customer,
      status: 'Assess', 
    });
    
    setApproveModalVisible(false);
    Alert.alert('Success', 'Assessment rejected');
    
  } catch (err) {
    Alert.alert('Error', `Failed to reject assessment: ${err.message}`);
    console.error('Error rejecting assessment:', err);
  } finally {
    setLoadingApproval(false);
  }
};

const handleOnboard = () => {
  router.push(`/onboard?clientId=${memberId}`);
};

const handleBMApproval = async () => {
  try {
    if (!selectedApprover) {
      Alert.alert('Error', 'Please select an approver');
      return;
    }

    setApprovingBM(true);
    const token = await AsyncStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('approved_by', selectedApprover);
    
    const response = await fetch(
      `${API_BASE_URL}/api/clients/${memberId}/bmapproval`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to approve by BM');
    }

    const result = await response.json();
    
    setCustomer({
      ...customer,
      status: 'Pending HQ Approval',  // Status 5
    });
    
    setBmApprovalModalVisible(false);
    setSelectedApprover('');
    Alert.alert('Success', 'BM approval completed');
    
  } catch (err) {
    Alert.alert('Error', `Failed to approve: ${err.message}`);
    console.error('Error with BM approval:', err);
  } finally {
    setApprovingBM(false);
  }
};

const handleHQApproval = async () => {
  try {
    if (!selectedApprover) {
      Alert.alert('Error', 'Please select an approver');
      return;
    }

    setApprovingHQ(true);
    const token = await AsyncStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('approved_by', selectedApprover);
    formData.append('date', approvalDate);
    
    const response = await fetch(
      `${API_BASE_URL}/api/clients/${memberId}/hqapproval`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to approve by HQ');
    }

    const result = await response.json();
    console.log('HQ Approval Result:', result);
    setHqApprovalModalVisible(false);
    setSelectedApprover('');
    Alert.alert('Success', 'HQ approval completed. Client is now dormant.');
    
    // ✅ Refresh the customer profile to get the updated status from backend
    await fetchCustomerProfile();
    
  } catch (err) {
    Alert.alert('Error', `Failed to approve: ${err.message}`);
    console.error('Error with HQ approval:', err);
  } finally {
    setApprovingHQ(false);
  }
};


const PAYMENT_TYPE_MAP = {
  cash: 1,
  mpesa_stk_push: 2,
  mpesa_c2b: 3,
  bank: 4,
  use_collateral: 5,
};

const ALLOCATION_TYPE_MAP = {
  membership_fee: 0,
  cash_collateral: 1,
  loan_insurance_fee: 2,
  loan_processing_fee: 3,
  loan_installment: 4,
  loan_access_fee: 5,
  default_recovery_fee: 6,
  loan_principal: 7,
  interest: 9,
  pre_disbursement_charges: 10,
  pay_loan: 4
};


const handleReceivePayment = async () => {
  try {
    Alert.alert('Debug', 'handleReceivePayment started');
    
    console.log('=== HANDLE RECEIVE PAYMENT ===');
    console.log('Payment Amount:', paymentAmount);
    console.log('Transaction Type:', transactionType);
    console.log('Allocated Payments:', JSON.stringify(allocatedPayments, null, 2));
    
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    if (!transactionType) {
      Alert.alert('Error', 'Please select a transaction type');
      return;
    }

    const validAllocations = allocatedPayments.filter(
      p => p.type && p.amount && parseFloat(p.amount) > 0
    );

    console.log('Valid Allocations:', JSON.stringify(validAllocations, null, 2));

    if (validAllocations.length === 0) {
      Alert.alert('Error', 'Please add at least one payment allocation');
      return;
    }

    Alert.alert(
      'Debug - Before Mapping',
      `First allocation:\nType: ${validAllocations[0].type}\nAmount: ${validAllocations[0].amount}`
    );

    console.log("Allocated Payments:", allocatedPayments);
    console.log("ALLOCATION_TYPE_MAP:", ALLOCATION_TYPE_MAP);

    setProcessingPayment(true);
    const token = await AsyncStorage.getItem('token');

    const allocations = validAllocations.map((allocation, index) => {
      const typeKey = allocation.type;
      const allocationType = ALLOCATION_TYPE_MAP[typeKey];
      
      if (allocationType === undefined) {
        Alert.alert(
          '⚠️ UNDEFINED TYPE',
          `Index: ${index}\nType Key: "${typeKey}"\nAvailable keys: ${Object.keys(ALLOCATION_TYPE_MAP).join(', ')}`
        );
      }
      
      return {
        amount: parseFloat(allocation.amount),
        allocation_type: allocationType,
      };
    });

    Alert.alert(
      'Debug - Final Allocations',
      JSON.stringify(allocations, null, 2)
    );

    console.log('\n=== Final Allocations Array ===');
    console.log(JSON.stringify(allocations, null, 2));

    const response = await fetch(`${API_BASE_URL}/api/payments/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        payment: {
          amount: parseFloat(paymentAmount),
          payment_type: PAYMENT_TYPE_MAP[transactionType],
          client_id: memberId,
          received_by: currentUser?.id,
          ref_no: paymentReference || null,
        },
        allocations: allocations,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to process payment');
    }

    // ✅ CHANGED: Update to Dormant instead of Active after membership fee payment
    if (isMembershipFeePayment) {
      setCustomer(prev => ({
        ...prev,
        status: 'Dormant',  // ✅ This will map to status 10 in backend
      }));
      Alert.alert(
        'Success', 
        'Membership fee payment processed successfully. Client is now dormant and can receive loans.'
      );
    } else {
      Alert.alert('Success', 'Payment processed successfully.');
    }

    setPaymentModalVisible(false);
    setPaymentAmount('');
    setPaymentReference('');
    setTransactionType('');
    setAllocatedPayments([{ type: '', amount: '' }]);
    
    // ✅ Refresh customer profile to get updated status from backend
    await fetchCustomerProfile();
    
  } catch (err) {
    Alert.alert('Error', `Failed to process payment: ${err.message}`);
    console.error('Error processing payment:', err);
  } finally {
    setProcessingPayment(false);
  }
};


const toggleDropdown = (field) => {
  setDropdownStates({
    ...Object.keys(dropdownStates).reduce((acc, key) => {
      acc[key] = key === field ? !dropdownStates[key] : false;
      return acc;
    }, {})
  });
};

const addBusinessType = () => {
  setAssessmentData({
    ...assessmentData,
    business_types: [...assessmentData.business_types, '']
  });
};

const updateBusinessType = (index, value) => {
  const newBusinessTypes = [...assessmentData.business_types];
  newBusinessTypes[index] = value;
  setAssessmentData({
    ...assessmentData,
    business_types: newBusinessTypes
  });
};

const removeBusinessType = (index) => {
  const newBusinessTypes = assessmentData.business_types.filter((_, i) => i !== index);
  setAssessmentData({
    ...assessmentData,
    business_types: newBusinessTypes
  });
};

const handleSubmitAssessment = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    
    const formData = new FormData();
    formData.append('surname', assessmentData.surname);
    formData.append('other_names', assessmentData.other_names);
    formData.append('phone', assessmentData.phone);
    formData.append('marketing_type', assessmentData.marketing_type);
    formData.append('business_nature', assessmentData.business_nature);
    formData.append('business_premise_type', assessmentData.business_premise_type);
    formData.append('stock_type', assessmentData.stock_type);
    formData.append('stock_level', assessmentData.stock_level);
    formData.append('interest_level', assessmentData.interest_level);
    formData.append('personal_character', assessmentData.personal_character);
    formData.append('owns_business', assessmentData.owns_business);
    formData.append('business_legitimacy', assessmentData.business_legitimacy);
    formData.append('loan_purpose', assessmentData.loan_purpose);
    
    formData.append('category', selectedCategory);

    console.log('businessTypeOptions:', businessTypeOptions);
    console.log('assessmentData.business_types:', assessmentData.business_types);
    
    
    const validBusinessTypesPayload = assessmentData.business_types
      .filter(bt => bt.trim() !== '')
      .map((businessTypeName) => {
        const matchedType = validBusinessTypes.find(
          (type) => type.business_type === businessTypeName
        );

        return {
          business_type: businessTypeName,
          business_type_id: matchedType?.business_type_id || null,
          business_class_id: matchedType?.business_class_id || null,
          category: selectedCategory
        };
      });

    console.log('validBusinessTypes (final payload):', validBusinessTypesPayload);

    formData.append('business_types_data', JSON.stringify(validBusinessTypesPayload));


    const response = await fetch(
      `${API_BASE_URL}/api/clients/${memberId}/initialassessment`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to submit assessment');
    }

    const result = await response.json();
    
    setCustomer({
      ...customer,
      status: 'Pending Approval',
    });
    
    setAssessModalVisible(false);
    Alert.alert('Success', 'Assessment submitted successfully');
    
  } catch (err) {
    Alert.alert('Error', `Failed to submit assessment: ${err.message}`);
    console.error('Error submitting assessment:', err);
  }
};

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading customer profile...</Text>
      </View>
    );
  }

  // Error state
  if (error || !customer) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#FF5252" />
        <Text style={styles.errorText}>
          {error || 'Failed to load profile'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchCustomerProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#666', marginTop: 10 }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Profile</Text>
          
          {/* Show both buttons for Active clients */}
          {customer.status === 'Active' || customer.status === 'Dormant' ? (
            <View style={styles.dualButtonContainer}>
              <TouchableOpacity 
                style={styles.receivePaymentButtonSmall}
                onPress={() => {
                  setIsMembershipFeePayment(false);
                  setPaymentModalVisible(true);
                }}
              >
                <Text style={styles.allocateButtonText}>Payment</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.createLoanButtonSmall}
                onPress={() => router.push(`/create_loan?client_id=${memberId}`)}
              >
                <Text style={styles.allocateButtonText}>Create Loan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={[
                styles.allocateButton,
                customer.status === 'Pending Assessment' && styles.assessButton,
                customer.status === 'Pending Approval' && styles.approveButton,
                customer.status === 'Pending Onboarding' && styles.onboardButton,
                customer.status === 'Pending BM Approval' && styles.bmApprovalButton,
                customer.status === 'Pending HQ Approval' && styles.hqApprovalButton,
                customer.status === 'Appraise' && styles.appraiseButton,
                customer.status === 'Approve Appraisal (BM)' && styles.approveButton,
                customer.status === 'Approve Appraisal (HQ)' && styles.approveButton,
                customer.status === 'Pending RF' && styles.receivePaymentButton,
              ]}
              onPress={handleStatusAction}
            >
              <Text style={styles.allocateButtonText}>
                {getButtonText(customer.status)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person-outline" size={40} color="#666" />
          </View>
          
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => router.push(`/client_details?member_id=${memberId}`)}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.phoneNumber}>{customer.phone}</Text>
            <Text style={styles.teamLabel}>Team: {customer.team || 'Not Assigned'}</Text>
          </View>
        </View>

        {/* Branch and Status Cards */}
        <View style={styles.infoCards}>
          <View style={styles.infoCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="business" size={20} color="#fff" />
            </View>
            <Text style={styles.infoCardLabel}>Branch</Text>
            <Text style={styles.infoCardValue}>{customer.branch}</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text" size={20} color="#fff" />
            </View>
            <Text style={styles.infoCardLabel}>Status</Text>
            <Text style={styles.infoCardValue}>{customer.status}</Text>
          </View>
        </View>

        {/* Loan Details Card */}
        <View style={styles.loanDetailsCard}>
          {loadingLoans ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4285F4" />
              <Text style={styles.loadingText}>Loading loan details...</Text>
            </View>
          ) : (() => {
            const loanSummary = calculateLoanSummary();
            return (
              <>
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>No of Loans:</Text>
                  <Text style={styles.loanValue}>{loanSummary.noOfLoans}</Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Loan Limit:</Text>
                  <Text style={styles.loanValue}>{loanSummary.loanLimit}</Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Loan Principal:</Text>
                  <Text style={[
                    styles.loanValue,
                    loanSummary.loanPrincipal !== 'Ksh 0' && styles.highlightValue
                  ]}>
                    {loanSummary.loanPrincipal}
                  </Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Date Disbursed:</Text>
                  <Text style={styles.loanValue}>{loanSummary.dateDisbursed}</Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Loan Due Date:</Text>
                  <Text style={styles.loanValue}>{loanSummary.loanDueDate}</Text>
                </View>
                
                <View style={styles.separator} />
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Repayable Amount:</Text>
                  <Text style={[
                    styles.loanValue,
                    loanSummary.repayableAmount !== 'Ksh 0' && styles.highlightValue
                  ]}>
                    {loanSummary.repayableAmount}
                  </Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Total Paid:</Text>
                  <Text style={[
                    styles.loanValue,
                    { color: '#4CAF50' }
                  ]}>
                    {loanSummary.totalPaid}
                  </Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Total Balance:</Text>
                  <Text style={[
                    styles.loanValue,
                    loanSummary.totalBalance !== 'Ksh 0' && { color: '#FF5722', fontWeight: '600' }
                  ]}>
                    {loanSummary.totalBalance}
                  </Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Balance Due Today:</Text>
                  <TouchableOpacity 
                    onPress={() => setShowBalanceDueToday(!showBalanceDueToday)}
                    style={styles.balanceToggleContainer}
                  >
                    {showBalanceDueToday ? (
                      <Text style={[
                        styles.loanValue,
                        loanSummary?.balanceDueToday !== 0 && { color: '#FF9800', fontWeight: '600' }
                      ]}>
                        Ksh {(loanSummary?.balanceDueToday || 0).toLocaleString()}
                      </Text>
                    ) : (
                      <Text style={styles.balanceHidden}>****</Text>
                    )}
                    <Ionicons 
                      name={showBalanceDueToday ? "eye-off" : "eye"} 
                      size={18} 
                      color="#666" 
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Amnt Bal for Next Top-up:</Text>
                  <Text style={[
                    styles.loanValue,
                    loanSummary.amntBalForTopup !== 'Ksh 0' && { color: '#FF9800', fontWeight: '600' }
                  ]}>
                    {loanSummary.amntBalForTopup}
                  </Text>
                </View>
                
                <View style={styles.loanRow}>
                  <Text style={styles.loanLabel}>Available Top-Up:</Text>
                  <Text style={styles.loanValue}>{loanSummary.availableTopUp}</Text>
                </View>
                
                {loans.length > 0 ? (
                  <TouchableOpacity 
                    style={styles.viewLoanButton}
                    onPress={() => {
                      router.push(`/loan_details?member_id=${memberId}`);
                    }}
                  >
                    <Text style={styles.viewLoanButtonText}>
                      View {loans.length} Loan{loans.length > 1 ? 's' : ''}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.viewLoanButton, { backgroundColor: '#4CAF50' }]}
                    onPress={() => router.push(`/create_loan?client_id=${memberId}`)}
                  >
                    <Text style={styles.viewLoanButtonText}>Create First Loan</Text>
                  </TouchableOpacity>
                )}
              </>
            );
          })()}
        </View>

                {/* Action Buttons Grid */}
                <View style={styles.actionButtonsGrid}>
          <TouchableOpacity style={[styles.actionButton, styles.locationButton]}>
            <Ionicons name="location-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Location</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.paroButton]}>
            <Ionicons name="folder-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>P.A.R(0's)</Text>
          </TouchableOpacity>
          
         <TouchableOpacity 
            style={[styles.actionButton, styles.loanLimitButton]}
            onPress={fetchLoanLimit}
            disabled={loadingLoanLimit}
          >
            {loadingLoanLimit ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="trending-up-outline" size={18} color="#fff" />
                <Text style={styles.actionButtonText}>Loan limit</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.creditButton]}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Credit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.debitButton]}>
            <Ionicons name="remove-circle-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Debit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, styles.recoveryButton]}>
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Recovery</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'All Instalments' && styles.activeTab]}
            onPress={() => setActiveTab('All Instalments')}
          >
            <Text style={[styles.tabText, activeTab === 'All Instalments' && styles.activeTabText]}>
              All Instalments
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Defaulted Instls' && styles.activeTab]}
            onPress={() => setActiveTab('Defaulted Instls')}
          >
            <Text style={[styles.tabText, activeTab === 'Defaulted Instls' && styles.activeTabText]}>
              Defaulted Instls
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Instls Due' && styles.activeTab]}
            onPress={() => setActiveTab('Instls Due')}
          >
            <Text style={[styles.tabText, activeTab === 'Instls Due' && styles.activeTabText]}>
              Instls Due
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loans Section */}
{activeTab === 'All Instalments' && (
  <View style={styles.loansSection}>
    {loadingLoans ? (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4285F4" />
    <Text style={styles.loadingText}>Loading loans...</Text>
  </View>
) : loans.length > 0 ? (
  loans.map((loan, index) => (
    <TouchableOpacity 
      key={loan.id || index} 
      style={styles.loanCard}
      onPress={() => router.push(`/loan_details?loan_id=${loan.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.loanHeader}>
        <Text style={styles.loanNumber}>{loan.loan_number}</Text>
        <Text style={[styles.loanStatus, 
          loan.status === 'DISBURSED' && styles.statusDisbursed,
          loan.status === 'DEFAULTED' && styles.statusDefaulted,
        ]}>
          {loan.status}
        </Text>
      </View>
      
      <View style={styles.loanDetails}>
        <View style={styles.loanDetailRow}>
          <Text style={styles.loanDetailLabel}>Amount:</Text>
          <Text style={styles.loanDetailValue}>Ksh {loan.amount?.toLocaleString()}</Text>
        </View>
        
        <View style={styles.loanDetailRow}>
          <Text style={styles.loanDetailLabel}>Balance:</Text>
          <Text style={styles.loanDetailValue}>
            Ksh {loan.outstanding_balance?.toLocaleString()}
          </Text>
        </View>
        
        {loan.product_name && (
          <View style={styles.loanDetailRow}>
            <Text style={styles.loanDetailLabel}>Product:</Text>
            <Text style={styles.loanDetailValue}>{loan.product_name}</Text>
          </View>
        )}
        
        {loan.disbursement_date && (
          <View style={styles.loanDetailRow}>
            <Text style={styles.loanDetailLabel}>Disbursed:</Text>
            <Text style={styles.loanDetailValue}>
              {new Date(loan.disbursement_date).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ))
) : (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="document-outline" size={40} color="#ccc" />
    </View>
    <Text style={styles.emptyStateText}>No loans available</Text>
  </View>
)}
  </View>
)}

{/* Disbursements Section */}
{activeTab === 'Defaulted Instls' && (
  <View style={styles.disbursementsSection}>
    {loadingDisbursements ? (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Loading disbursements...</Text>
      </View>
    ) : disbursements.length > 0 ? (
      <>
        {disbursements.map((disbursement, index) => (
          <View key={disbursement.id || index} style={styles.disbursementCard}>
            <View style={styles.disbursementRow}>
              <Text style={styles.disbursementLabel}>Amount:</Text>
              <Text style={styles.disbursementValue}>
                Ksh {disbursement.amount?.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.disbursementRow}>
              <Text style={styles.disbursementLabel}>Date:</Text>
              <Text style={styles.disbursementValue}>
                {disbursement.date ? new Date(disbursement.date).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            
            {disbursement.loan_number && (
              <View style={styles.disbursementRow}>
                <Text style={styles.disbursementLabel}>Loan:</Text>
                <Text style={styles.disbursementValue}>{disbursement.loan_number}</Text>
              </View>
            )}
            
            {disbursement.transaction_ref && (
              <View style={styles.disbursementRow}>
                <Text style={styles.disbursementLabel}>Ref:</Text>
                <Text style={styles.disbursementValue}>{disbursement.transaction_ref}</Text>
              </View>
            )}
          </View>
        ))}
        
        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity 
            style={[styles.paginationButton, disbursementPage === 1 && styles.paginationButtonDisabled]}
            onPress={() => fetchDisbursements(disbursementPage - 1)}
            disabled={disbursementPage === 1}
          >
            <Text style={styles.paginationButtonText}>Previous</Text>
          </TouchableOpacity>
          
          <Text style={styles.paginationText}>Page {disbursementPage}</Text>
          
          <TouchableOpacity 
            style={[styles.paginationButton, 
              disbursements.length < 5 && styles.paginationButtonDisabled]}
            onPress={() => fetchDisbursements(disbursementPage + 1)}
            disabled={disbursements.length < 5}
          >
            <Text style={styles.paginationButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </>
    ) : (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="document-outline" size={40} color="#ccc" />
        </View>
        <Text style={styles.emptyStateText}>No disbursements available</Text>
      </View>
    )}
  </View>
)}
      </ScrollView>

      {/* Allocate Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Allocate Client</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Team Dropdown */}
              <Text style={styles.dropdownLabel}>Team</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => {
                  setShowTeamDropdown(!showTeamDropdown);
                  setShowBDEDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {selectedTeam 
                    ? (typeof selectedTeam === 'string' 
                        ? selectedTeam 
                        : (selectedTeam.name || selectedTeam.team_name || 'Select Team'))
                    : 'Select Team'
                  }
                </Text>
                <Ionicons name="chevron-down" size={24} color="#333" />
              </TouchableOpacity>

              {/* Team Dropdown List */}
              {showTeamDropdown && (
                <View style={styles.dropdownList}>
                  {teams.length > 0 ? (
                    teams.map((team, index) => {
                      // Handle both string and object formats
                      const teamName = typeof team === 'string' 
                        ? team 
                        : (team.name || team.team_name || 'Unknown Team');
                      const teamId = typeof team === 'string' ? null : team.id;
                      
                      return (
                        <TouchableOpacity
                          key={teamId || index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedTeam(team); 
                            setShowTeamDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{teamName}</Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.dropdownItemText}>No teams available</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.dropdownLabel}>BDE</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => {
                  setShowBDEDropdown(!showBDEDropdown);
                  setShowTeamDropdown(false);
                }}
              >
                <Text style={styles.dropdownText}>
                  {selectedBDE || 'Select BDE'}
                </Text>
                <Ionicons name="chevron-down" size={24} color="#333" />
              </TouchableOpacity>

              {showBDEDropdown && (
                <View style={styles.dropdownList}>
                  {users.length > 0 ? (
                    users.map((user, index) => {
                      const userName = typeof user === 'string' 
                        ? user 
                        : (user.name || user.full_name || user.username || `User ${index + 1}`);
                      
                      return (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedBDE(userName);
                            setShowBDEDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{userName}</Text>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.dropdownItemText}>No BDEs available</Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity 
                style={[
                  styles.modalAllocateButton,
                  (!selectedTeam || !selectedBDE) && styles.modalAllocateButtonDisabled
                ]}
                onPress={handleAllocate}
                disabled={!selectedTeam || !selectedBDE}
              >
                <Text style={styles.modalAllocateButtonText}>Allocate</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Assessment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={assessModalVisible}
        onRequestClose={() => setAssessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.assessModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initial Lead Assessment</Text>
              <TouchableOpacity 
                onPress={() => setAssessModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

           <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={true}  
              contentContainerStyle={styles.modalScrollContent}  
              bounces={true}  
            >
              {/* Surname Name */}
              <Text style={styles.inputLabel}>Surname Name</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputText}>{assessmentData.surname}</Text>
              </View>

              {/* Other Names and Phone No Row */}
              <View style={styles.rowContainer}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Other Names</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputText}>{assessmentData.other_names}</Text>
                  </View>
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Phone No.</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputText}>{assessmentData.phone}</Text>
                  </View>
                </View>
              </View>

              {/* Marketing Type */}
              <Text style={styles.inputLabel}>Marketing Type</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => toggleDropdown('marketing_type')}
              >
                <Text style={styles.dropdownText}>
                  {assessmentData.marketing_type || '--Select--'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#333" />
              </TouchableOpacity>
              {dropdownStates.marketing_type && (
                <View style={styles.dropdownList}>
                  {['Routine', 'Activation', 'Referrals', 'Online'].map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        handleAssessmentInputChange('marketing_type', item);
                        toggleDropdown('marketing_type');
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Nature of Business and Business Premise Type Row */}
              <View style={styles.rowContainer}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Nature of Business</Text>
                  <TextInput
                    style={styles.textInput}
                    value={assessmentData.business_nature}
                    onChangeText={(text) => handleAssessmentInputChange('business_nature', text)}
                    placeholder="Enter business nature"
                  />
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Business Premise Type</Text>
                  <TextInput
                    style={styles.textInput}
                    value={assessmentData.business_premise_type}
                    onChangeText={(text) => handleAssessmentInputChange('business_premise_type', text)}
                    placeholder="Enter premise type"
                  />
                </View>
              </View>

              {/* Stock Type */}
              <Text style={styles.inputLabel}>Stock Type</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => toggleDropdown('stock_type')}
              >
                <Text style={styles.dropdownText}>
                  {assessmentData.stock_type || '--Select--'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#333" />
              </TouchableOpacity>
              {dropdownStates.stock_type && (
                <View style={styles.dropdownList}>
                  {['Services', 'Perishable', 'Non-Perishable'].map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        handleAssessmentInputChange('stock_type', item);
                        toggleDropdown('stock_type');
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Stock Level and Level of Interest Row */}
              <View style={styles.rowContainer}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Stock Level</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => toggleDropdown('stock_level')}
                  >
                    <Text style={styles.dropdownText}>
                      {assessmentData.stock_level || '--Select--'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#333" />
                  </TouchableOpacity>
                  {dropdownStates.stock_level && (
                    <View style={styles.dropdownList}>
                      {['Low', 'Medium', 'High'].map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            handleAssessmentInputChange('stock_level', item);
                            toggleDropdown('stock_level');
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Level of Interest</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => toggleDropdown('interest_level')}
                  >
                    <Text style={styles.dropdownText}>
                      {assessmentData.interest_level || '--Select--'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#333" />
                  </TouchableOpacity>
                  {dropdownStates.interest_level && (
                    <View style={styles.dropdownList}>
                      {['Low', 'Medium', 'High'].map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            handleAssessmentInputChange('interest_level', item);
                            toggleDropdown('interest_level');
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Personal Character */}
              <Text style={styles.inputLabel}>Personal Character</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => toggleDropdown('personal_character')}
              >
                <Text style={styles.dropdownText}>
                  {assessmentData.personal_character || '--Select--'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#333" />
              </TouchableOpacity>
              {dropdownStates.personal_character && (
                <View style={styles.dropdownList}>
                  {['Positive', 'Neutral', 'Negative'].map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.dropdownItem}
                      onPress={() => {
                        handleAssessmentInputChange('personal_character', item);
                        toggleDropdown('personal_character');
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Business Ownership and Business Legitimacy Row */}
              <View style={styles.rowContainer}>
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Business Ownership</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => toggleDropdown('owns_business')}
                  >
                    <Text style={styles.dropdownText}>
                      {assessmentData.owns_business || '--Select--'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#333" />
                  </TouchableOpacity>
                  {dropdownStates.owns_business && (
                    <View style={styles.dropdownList}>
                      {['Yes', 'No'].map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            handleAssessmentInputChange('owns_business', item);
                            toggleDropdown('owns_business');
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                
                <View style={styles.halfWidth}>
                  <Text style={styles.inputLabel}>Business Legitimacy</Text>
                  <TouchableOpacity 
                    style={styles.dropdown}
                    onPress={() => toggleDropdown('business_legitimacy')}
                  >
                    <Text style={styles.dropdownText}>
                      {assessmentData.business_legitimacy || '--Select--'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#333" />
                  </TouchableOpacity>
                  {dropdownStates.business_legitimacy && (
                    <View style={styles.dropdownList}>
                      {['Yes', 'No'].map((item, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.dropdownItem}
                          onPress={() => {
                            handleAssessmentInputChange('business_legitimacy', item);
                            toggleDropdown('business_legitimacy');
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Purpose of Loan */}
              <Text style={styles.inputLabel}>Purpose of Loan</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={assessmentData.loan_purpose}
                onChangeText={(text) => handleAssessmentInputChange('loan_purpose', text)}
                placeholder="Describe the purpose"
                multiline
                numberOfLines={3}
              />

              {/* Business Type and Category */}
              <View style={styles.businessTypeHeader}>
                <Text style={styles.inputLabel}>Business Type and Category</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {loadingBusinessTypes && (
                    <ActivityIndicator size="small" color="#4285F4" />
                  )}
                  <TouchableOpacity onPress={addBusinessType}>
                    <Text style={styles.addButtonText}>+ Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {assessmentData.business_types.map((businessType, index) => (
                <View key={index} style={styles.businessTypeSection}>
                  <View style={styles.businessTypeRow}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={businessType}
                      onChangeText={(text) => handleBusinessTypeSearch(text, index)}
                      placeholder="Start typing business type"
                      onFocus={() => {
                        if (businessType.trim().length > 0) {
                          const filtered = businessTypeOptions.filter(type =>
                            type.toLowerCase().includes(businessType.toLowerCase())
                          );
                          setFilteredBusinessTypes(filtered);
                          setShowBusinessTypeSuggestions(filtered.length > 0);
                        }
                      }}
                      
                    />
                    {assessmentData.business_types.length > 1 && (
                      <TouchableOpacity 
                        onPress={() => removeBusinessType(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF5252" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Suggestions Dropdown */}
                  {showBusinessTypeSuggestions && filteredBusinessTypes.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <ScrollView 
                        style={styles.suggestionsList} 
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="always"  
                      >
                        {filteredBusinessTypes.map((type, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={styles.suggestionItem}
                            onPress={() => selectBusinessType(type, index)}
                            activeOpacity={0.7}  // Add visual feedback
                          >
                            <Text style={styles.suggestionText}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  
                  {/* No match message */}
                  {showBusinessTypeSuggestions && 
                  businessType.trim().length > 0 && 
                  filteredBusinessTypes.length === 0 && (
                    <View style={styles.noMatchContainer}>
                      <Text style={styles.noMatchText}>
                        No matching business type found in database
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Category Radio Buttons - Separate Section */}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Category</Text>
              <View style={styles.radioContainer}>
                <TouchableOpacity 
                  style={styles.radioButton}
                  onPress={() => setSelectedCategory('Retail')}
                >
                  <View style={[styles.radioCircle, selectedCategory === 'Retail' && styles.radioCircleSelected]}>
                    {selectedCategory === 'Retail' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>Retail</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.radioButton}
                  onPress={() => setSelectedCategory('Wholesale')}
                >
                  <View style={[styles.radioCircle, selectedCategory === 'Wholesale' && styles.radioCircleSelected]}>
                    {selectedCategory === 'Wholesale' && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>Wholesale</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.submitButton}
                onPress={handleSubmitAssessment}
              >
                <Text style={styles.submitButtonText}>Submit Assessment</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
    </Modal>
      {/* Approval Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={approveModalVisible}
        onRequestClose={() => setApproveModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.approveModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Approve Initial Assessment for {customer?.name}</Text>
              <TouchableOpacity 
                onPress={() => setApproveModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.reviewText}>
              Review the details keenly before making a decision.
            </Text>

            {assessmentDetails ? (
              <>
                {/* Client Info */}
                <View style={styles.detailRow}>
                  <Ionicons name="person-outline" size={18} color="#333" />
                  <Text style={styles.detailText}>{assessmentDetails.surname} {assessmentDetails.other_names}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="call-outline" size={18} color="#333" />
                  <Text style={styles.detailText}>{assessmentDetails.phone}</Text>
                </View>

                {assessmentDetails.team && (
                  <View style={styles.detailRow}>
                    <Ionicons name="people-outline" size={18} color="#333" />
                    <Text style={styles.detailLabel}>Team:</Text>
                    <Text style={styles.detailText}>{assessmentDetails.team}</Text>
                  </View>
                )}

                <View style={styles.detailSeparator} />

                {/* Marketing Type */}
                <View style={styles.detailRow}>
                  <Ionicons name="megaphone-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Marketing Type:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.marketing_type || 'N/A'}</Text>
                </View>

                {/* Business Nature */}
                <View style={styles.detailRow}>
                  <Ionicons name="business-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Business Nature:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.business_nature || 'N/A'}</Text>
                </View>

                {/* Business Premise Type */}
                <View style={styles.detailRow}>
                  <Ionicons name="home-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Business Premise Type:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.business_premise_type || 'N/A'}</Text>
                </View>

                {/* Stock Type */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Stock Type:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.stock_type || 'N/A'}</Text>
                </View>

                {/* Stock Level */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Stock Level:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.stock_level || 'N/A'}</Text>
                </View>

                {/* Interest Level */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Interest Level:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.interest_level || 'N/A'}</Text>
                </View>

                {/* Personal Character */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Personal Character:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.personal_character || 'N/A'}</Text>
                </View>

                {/* Owns Business */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Owns Business?:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.owns_business || 'N/A'}</Text>
                </View>

                {/* Business Legitimacy */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Business Legitimate?:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.business_legitimacy || 'N/A'}</Text>
                </View>

                {/* Loan Purpose */}
                <View style={styles.detailRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#333" />
                  <Text style={styles.detailLabel}>Loan Purpose:</Text>
                  <Text style={styles.detailText}>{assessmentDetails.loan_purpose || 'N/A'}</Text>
                </View>

                {/* Business Types */}
                {assessmentDetails.business_types && assessmentDetails.business_types.length > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="list-outline" size={18} color="#333" />
                    <Text style={styles.detailLabel}>Business Types:</Text>
                    <Text style={styles.detailText}>
                      {assessmentDetails.business_types.map(bt => {
                        if (typeof bt === 'string') return bt;
                        const businessType = bt.business_type || bt.name || 'N/A';
                        const category = bt.category || assessmentDetails.category || '';
                        return category ? `${businessType} (${category})` : businessType;
                      }).join(', ')}
                    </Text>
                  </View>
                )}

                {/* Category Display */}
                {assessmentDetails.category && (
                  <View style={styles.detailRow}>
                    <Ionicons name="pricetag-outline" size={18} color="#333" />
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailText}>{assessmentDetails.category}</Text>
                  </View>
                )}

                {/* Assessment Info */}
                {assessmentDetails.assessed_by && (
                  <View style={styles.detailSeparator} />
                )}
                
                {assessmentDetails.assessed_by && (
                  <View style={styles.detailRow}>
                    <Ionicons name="clipboard-outline" size={18} color="#333" />
                    <Text style={styles.detailLabel}>Assessed by:</Text>
                    <Text style={styles.detailText}>{assessmentDetails.assessed_by}</Text>
                  </View>
                )}

                {assessmentDetails.assessed_on && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Assessed On:</Text>
                    <Text style={styles.detailText}>{assessmentDetails.assessed_on}</Text>
                    <Text style={styles.detailLabel}>Assessed At:</Text>
                    <Text style={styles.detailText}>{assessmentDetails.assessed_at}</Text>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.approvalButtonsContainer}>
                  <TouchableOpacity 
                    style={styles.rejectButton}
                    onPress={handleRejectAssessment}
                    disabled={loadingApproval}
                  >
                    {loadingApproval ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approvalButtonText}>Reject Assessment</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.approveButton}
                    onPress={handleApproveAssessment}
                    disabled={loadingApproval}
                  >
                    {loadingApproval ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.approvalButtonText}>Approve Assessment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>No assessment data available</Text>
              </View>
            )}
          </ScrollView>
          </View>
        </View>
      </Modal>
      {/* BM Approval Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bmApprovalModalVisible}
        onRequestClose={() => setBmApprovalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.approvalModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Individual member BM Approval</Text>
              <TouchableOpacity 
                onPress={() => setBmApprovalModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.approvalInfoText}>
                Only BM staff of this member's branch can be able to perform this action
              </Text>

              <Text style={styles.inputLabel}>Approved by</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedApprover}
                  onValueChange={(value) => setSelectedApprover(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select --" value="" />
                  {users.map((user, index) => {
                    const userName = typeof user === 'string' 
                      ? user 
                      : (user.name || user.full_name || user.username || `User ${index + 1}`);
                    const userId = typeof user === 'string' 
                      ? userName 
                      : (user.id || userName);
                    
                    return (
                      <Picker.Item 
                        key={index} 
                        label={userName} 
                        value={userId} 
                      />
                    );
                  })}
                </Picker>
              </View>

              <View style={styles.approvalButtonsRow}>
                <TouchableOpacity 
                  style={styles.approveButtonLarge}
                  onPress={handleBMApproval}
                  disabled={approvingBM || !selectedApprover}
                >
                  {approvingBM ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve Member</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.declineButtonLarge}
                  onPress={() => setBmApprovalModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.declineButtonText}>Decline Member</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {/* HQ Approval Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={hqApprovalModalVisible}
        onRequestClose={() => setHqApprovalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.approvalModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Individual member HQ Approval</Text>
              <TouchableOpacity 
                onPress={() => setHqApprovalModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.approvalInfoText}>
                Only HQ staff designated to approved member can be able to perform this action
              </Text>

              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: '#f0f0f0' }]}
                value={approvalDate}
                editable={false}
              />

              <Text style={styles.inputLabel}>Approved by</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedApprover}
                  onValueChange={(value) => setSelectedApprover(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select --" value="" />
                  {users.map((user, index) => {
                    const userName = typeof user === 'string' 
                      ? user 
                      : (user.name || user.full_name || user.username || `User ${index + 1}`);
                    const userId = typeof user === 'string' 
                      ? userName 
                      : (user.id || userName);
                    
                    return (
                      <Picker.Item 
                        key={index} 
                        label={userName} 
                        value={userId} 
                      />
                    );
                  })}
                </Picker>
              </View>

              <View style={styles.approvalButtonsRow}>
                <TouchableOpacity 
                  style={styles.approveButtonLarge}
                  onPress={handleHQApproval}
                  disabled={approvingHQ || !selectedApprover}
                >
                  {approvingHQ ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.approveButtonText}>Approve Member</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.declineButtonLarge}
                  onPress={() => setHqApprovalModalVisible(false)}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.declineButtonText}>Decline Member</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
      {/* Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receive Payment</Text>
              <TouchableOpacity 
                onPress={() => setPaymentModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Payment received by */}
              <Text style={styles.inputLabel}>Payment received by</Text>
              <View style={[styles.textInput, { backgroundColor: '#f0f0f0' }]}>
                <Text>
                  {currentUser ? currentUser.name : 'Loading...'}
                </Text>
              </View>



              {/* Date */}
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity 
                style={styles.textInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={paymentDate ? styles.dateText : styles.placeholderText}>
                  {paymentDate ? paymentDate.toLocaleDateString() : ''}
                </Text>
              </TouchableOpacity>

              {/* Transaction type */}
              <Text style={styles.inputLabel}>Transaction type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={transactionType}
                  onValueChange={(value) => setTransactionType(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="- Select -" value="" />
                  <Picker.Item label="Cash" value="cash" />
                  <Picker.Item label="mpesa STK push" value="mpesa_stk_push" />
                  <Picker.Item label="mpesa c2b" value="mpesa_c2b" />
                  <Picker.Item label="bank" value="bank" />
                  <Picker.Item label="use collateral" value="use_collateral" />
                </Picker>
              </View>

              {/* Transact No / ref code */}
              <Text style={styles.inputLabel}>Transact No / ref code</Text>
              <TextInput
                style={styles.textInput}
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder=""
              />

              {/* Amount */}
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.textInput}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder=""
                keyboardType="numeric"
              />

              {/* Allocate Payments Section */}
              <View style={styles.allocateSection}>
                <Text style={styles.allocateSectionTitle}>Allocate Payments</Text>
                
                {allocatedPayments.map((payment, index) => (
                  <View key={index} style={styles.allocationItem}>
                    <Text style={styles.inputLabel}>Payment type</Text>
                    
                    {/* Custom Dropdown replacing Picker */}
                    <TouchableOpacity 
                      style={styles.dropdown}
                      onPress={() => {
                        console.log('🎯 Dropdown pressed for index:', index);
                        setActiveAllocationDropdown(activeAllocationDropdown === index ? null : index);
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {payment.type ? 
                          payment.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
                          : '- Select -'
                        }
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#333" />
                    </TouchableOpacity>

                    {/* Dropdown List */}
                    {activeAllocationDropdown === index && (
                      <View style={styles.dropdownList}>
                        {isMembershipFeePayment ? (
                          <TouchableOpacity
                            style={styles.dropdownItem}
                            onPress={() => {
                              console.log('✅ Selected: membership_fee for index:', index);
                              updateAllocation(index, 'type', 'membership_fee');
                              setActiveAllocationDropdown(null);
                            }}
                          >
                            <Text style={styles.dropdownItemText}>Membership Fee</Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={() => {
                                console.log('✅ Selected: cash_collateral for index:', index);
                                updateAllocation(index, 'type', 'cash_collateral');
                                setActiveAllocationDropdown(null);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>Cash Collateral</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={() => {
                                console.log('✅ Selected: pay_loan for index:', index);
                                updateAllocation(index, 'type', 'pay_loan');
                                setActiveAllocationDropdown(null);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>Pay Loan</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                              style={styles.dropdownItem}
                              onPress={() => {
                                console.log('✅ Selected: loan_access_fee for index:', index);
                                updateAllocation(index, 'type', 'loan_access_fee');
                                setActiveAllocationDropdown(null);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>Loan Access Fee (For a Pending Top-Up)</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    <Text style={styles.inputLabel}>Allocate Amount</Text>
                    <TextInput
                      style={styles.textInput}
                      value={payment.amount}
                      onChangeText={(value) => {
                        console.log('💰 Amount changed for index:', index, 'Value:', value);
                        updateAllocation(index, 'amount', value);
                      }}
                      placeholder="Enter amount"
                      keyboardType="numeric"
                    />
                  </View>
                ))}

                <TouchableOpacity 
                  style={styles.addPaymentButton}
                  onPress={addAllocation}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.addPaymentButtonText}>Add Payment</Text>
                </TouchableOpacity>

                {/* Summary */}
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total amount</Text>
                    <Text style={styles.summaryValue}>{(parseFloat(paymentAmount) || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total allocated</Text>
                    <Text style={styles.summaryValue}>{totalAllocated.toFixed(2)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total balance</Text>
                    <Text style={styles.summaryValue}>{totalBalance.toFixed(2)}</Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={handleReceivePayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Payment</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setPaymentModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Loan Limit Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={loanLimitModalVisible}
        onRequestClose={() => setLoanLimitModalVisible(false)}
      >
        <View style={styles.loanLimitModalOverlay}>
          <View style={styles.changeLoanLimitModalContent}>
            <View style={styles.changeLoanLimitHeader}>
              <Text style={styles.changeLoanLimitTitle}>Change Loan limit</Text>
              <TouchableOpacity 
                onPress={() => {
                  setLoanLimitModalVisible(false);
                  setNewLoanLimit('');
                }}
                style={styles.loanLimitCloseButton}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.changeLoanLimitBody}>
              {/* Current Limit Display */}
              <View style={styles.currentLimitSection}>
                <Text style={styles.currentLimitLabel}>Current limit</Text>
                <Text style={styles.currentLimitValue}>
                  KES {loanLimitData?.approvedLimit?.toLocaleString() || '0.0'}
                </Text>
              </View>

              {/* New Credit Limit Input */}
              <Text style={styles.newLimitLabel}>Enter New Credit Limit</Text>
              <TextInput
                style={styles.newLimitInput}
                value={newLoanLimit}
                onChangeText={setNewLoanLimit}
                placeholder="Enter new limit amount"
                keyboardType="numeric"
              />

              {/* Set New Limit Button */}
              <TouchableOpacity 
                style={styles.setNewLimitButton}
                onPress={handleSetNewLimit}
                disabled={!newLoanLimit || parseFloat(newLoanLimit) <= 0}
              >
                <Ionicons name="trending-up" size={20} color="#fff" />
                <Text style={styles.setNewLimitButtonText}>Set new limit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF5252',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    backgroundColor: '#4285F4',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 44,
  },
  header: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    flex: 1,
    marginLeft: 16,
  },
  allocateButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  assessButton: {
    backgroundColor: '#FF9800',
  },
  onboardButton: {
    backgroundColor: '#215df3ff',
  },
  approveButton: {
    backgroundColor: '#9C27B0',
  },
  bmApprovalButton: {
    backgroundColor: '#FF5722',
  },
  hqApprovalButton: {
    backgroundColor: '#FF5722',
  },
  appraiseButton: {
    backgroundColor: '#00BCD4',
  },
  receivePaymentButton: {
    backgroundColor: '#4CAF50',
  },
  allocateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailsButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  detailsButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  teamLabel: {
    fontSize: 13,
    color: '#666',
  },
  infoCards: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoCardLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  infoCardValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  loanDetailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
  },
  loanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  loanLabel: {
    fontSize: 13,
    color: '#666',
  },
  loanValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  viewLoanButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  viewLoanButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  actionButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  actionButton: {
    width: '31.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  locationButton: {
    backgroundColor: '#4285F4',
  },
  paroButton: {
    backgroundColor: '#4CAF50',
  },
  loanLimitButton: {
    backgroundColor: '#4285F4',
  },
  creditButton: {
    backgroundColor: '#4285F4',
  },
  debitButton: {
    backgroundColor: '#4285F4',
  },
  recoveryButton: {
    backgroundColor: '#4285F4',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#f0f0f0',
  },
  tabText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#333',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 2,
  },
  modalBody: {
    padding: 16,
    paddingBottom: 0,
  },
  modalScrollContent: {  
  paddingBottom: 100,
},
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 4,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  dropdownText: {
    fontSize: 15,
    color: '#333',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 12,
    marginTop: -8,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#333',
  },
  modalAllocateButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalAllocateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalAllocateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  assessModalContent: {
  backgroundColor: '#fff',
  borderRadius: 16,
  width: '90%',
  maxHeight: '90%',
  overflow: 'hidden',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
    marginTop: 8,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    marginBottom: 8,
  },
  inputText: {
    fontSize: 15,
    color: '#333',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  halfWidth: {
    flex: 1,
  },
  businessTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  addButtonText: {
    color: '#4285F4',
    fontSize: 15,
    fontWeight: '600',
  },
  businessTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  removeButton: {
    padding: 4,
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#4285F4',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4285F4',
  },
  radioLabel: {
    fontSize: 15,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  businessTypeSection: {
  marginBottom: 8,
  position: 'relative',
  zIndex: 1,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    marginTop: -8,
    marginBottom: 8,
    maxHeight: 150,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  noMatchContainer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    marginBottom: 8,
  },
  noMatchText: {
    fontSize: 13,
    color: '#F57C00',
    fontStyle: 'italic',
  },
  approveModalContent: {
  backgroundColor: '#fff',
  borderRadius: 16,
  width: '90%',
  maxHeight: '85%',
  overflow: 'hidden',
  },
  reviewText: {
    fontSize: 14,
    color: '#4285F4',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailSeparator: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  approvalButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  approvalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  activeButton: {
  backgroundColor: '#4CAF50',
  },
  submitButtonDisabled: {
  backgroundColor: '#ccc',
  opacity: 0.6,
},
 pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  dateText: {
    color: '#000',
    fontSize: 16,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  allocateSection: {
    backgroundColor: '#f0f4ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  allocateSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  allocationItem: {
    marginBottom: 16,
  },
  addPaymentButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addPaymentButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  loansSection: {
  padding: 16,
},
loanCard: {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
loanHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
loanNumber: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
},
loanStatus: {
  fontSize: 12,
  fontWeight: '600',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4,
  backgroundColor: '#e0e0e0',
  color: '#666',
},
statusDisbursed: {
  backgroundColor: '#C8E6C9',
  color: '#2E7D32',
},
statusDefaulted: {
  backgroundColor: '#FFCDD2',
  color: '#C62828',
},
loanDetails: {
  gap: 8,
},
loanDetailRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
loanDetailLabel: {
  fontSize: 14,
  color: '#666',
},
loanDetailValue: {
  fontSize: 14,
  fontWeight: '500',
  color: '#333',
},
disbursementsSection: {
  padding: 16,
},
disbursementCard: {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
disbursementRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
disbursementLabel: {
  fontSize: 14,
  color: '#666',
},
disbursementValue: {
  fontSize: 14,
  fontWeight: '500',
  color: '#333',
},
paginationContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 16,
  paddingHorizontal: 16,
},
paginationButton: {
  backgroundColor: '#4285F4',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 6,
},
paginationButtonDisabled: {
  backgroundColor: '#ccc',
},
paginationButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},
paginationText: {
  fontSize: 14,
  color: '#666',
  fontWeight: '500',
},
loadingContainer: {
  paddingVertical: 40,
  alignItems: 'center',
},
loadingText: {
  marginTop: 8,
  fontSize: 14,
  color: '#666',
},
highlightValue: {
  color: '#4285F4',
  fontWeight: '600',
},
approvalModalContainer: {
  backgroundColor: '#fff',
  borderRadius: 16,
  width: '90%',
  maxHeight: '60%',
  overflow: 'hidden',
},
approvalInfoText: {
  fontSize: 14,
  color: '#4285F4',
  marginBottom: 20,
  lineHeight: 20,
},
approvalButtonsRow: {
  flexDirection: 'row',
  gap: 12,
  marginTop: 24,
},
approveButtonLarge: {
  flex: 1,
  backgroundColor: '#4285F4',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 14,
  borderRadius: 8,
},
approveButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
},
declineButtonLarge: {
  flex: 1,
  backgroundColor: '#F44336',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  paddingVertical: 14,
  borderRadius: 8,
},
declineButtonText: {
  color: '#fff',
  fontSize: 15,
  fontWeight: '600',
},
dualButtonContainer: {
  flexDirection: 'row',
  gap: 8,
},
receivePaymentButtonSmall: {
  backgroundColor: '#4CAF50',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 4,
},
createLoanButtonSmall: {
  backgroundColor: '#2196F3',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 4,
},
loanLimitModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
loanLimitModalContent: {
  backgroundColor: '#fff',
  borderRadius: 12,
  width: '85%',
  maxHeight: '60%',
  overflow: 'hidden',
},
loanLimitModalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
loanLimitModalTitle: {
  fontSize: 20,
  fontWeight: '600',
  color: '#333',
},
loanLimitCloseButton: {
  padding: 4,
},
loanLimitModalBody: {
  padding: 20,
},
loanLimitDescription: {
  fontSize: 14,
  color: '#666',
  lineHeight: 20,
  marginBottom: 24,
},
highlightedText: {
  color: '#4285F4',
  fontWeight: '600',
},
loanLimitDetails: {
  gap: 20,
},
productLimitSection: {
  backgroundColor: '#f8f9fa',
  padding: 16,
  borderRadius: 8,
},
productName: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
  marginBottom: 12,
},
limitRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
limitLabel: {
  fontSize: 14,
  color: '#666',
},
limitValue: {
  fontSize: 16,
  fontWeight: '600',
  color: '#4285F4',
},
limitValueApproved: {
  fontSize: 16,
  fontWeight: '600',
  color: '#4285F4',
},
noDataContainer: {
  paddingVertical: 40,
  alignItems: 'center',
},
noDataText: {
  fontSize: 14,
  color: '#999',
},
changeLoanLimitModalContent: {
  backgroundColor: '#fff',
  borderRadius: 12,
  width: '85%',
  overflow: 'hidden',
},
changeLoanLimitHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: 20,
  paddingVertical: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
changeLoanLimitTitle: {
  fontSize: 20,
  fontWeight: '600',
  color: '#333',
},
changeLoanLimitBody: {
  padding: 20,
},
currentLimitSection: {
  marginBottom: 24,
},
currentLimitLabel: {
  fontSize: 14,
  color: '#666',
  marginBottom: 8,
},
currentLimitValue: {
  fontSize: 32,
  fontWeight: '700',
  color: '#4285F4',
},
newLimitLabel: {
  fontSize: 14,
  fontWeight: '500',
  color: '#333',
  marginBottom: 8,
},
newLimitInput: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 16,
  color: '#333',
  backgroundColor: '#fff',
  marginBottom: 24,
},
setNewLimitButton: {
  backgroundColor: '#4285F4',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  borderRadius: 8,
  gap: 8,
},
setNewLimitButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
balanceToggleContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
balanceHidden: {
  fontSize: 13,
  color: '#333',
  fontWeight: '500',
  letterSpacing: 2,
}
});

export default Profile;