import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const { API_BASE_URL } = Constants.expoConfig.extra;

export default function ApplyLoan() {
  const { client_id } = useLocalSearchParams();
  const clientId = client_id;
  const [currentBalance, setCurrentBalance] = useState('');
  const [availableLimit, setAvailableLimit] = useState('');
  const [appliedAmount, setAppliedAmount] = useState('');
  const [isEditable, setIsEditable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [approvedLoanLimit, setApprovedLoanLimit] = useState('');
  

  useEffect(() => {
    fetchLoanDetails();
  }, []);

  const fetchLoanDetails = async () => {
  setLoading(true);
  try {
    let token = await AsyncStorage.getItem('token');
    if (!token) {
      token = await AsyncStorage.getItem('access_token') || await AsyncStorage.getItem('userToken');
    }
    
    let activeClientId = clientId;
    
    // If no clientId from params, try to get from AsyncStorage
    if (!activeClientId) {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const user = JSON.parse(storedUserData);
        if (user.id) {
          activeClientId = user.id;
          console.log('Using client ID from storage:', activeClientId);
        }
      }
      
      if (!activeClientId) {
        Alert.alert('Error', 'User information not found');
        setLoading(false);
        router.back();
        return;
      }
    }

    // Fetch loan summary
    const response = await fetch(
      `${API_BASE_URL}/api/loans/client-summary-with-calculations/${activeClientId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    const data = await response.json();
    console.log('Loan details response:', data); 
    
    if (response.ok && data.success && data.payload) {
      const payload = data.payload;
      
      const balance = payload.cumulative_totals?.totalBalance || 0;
      setCurrentBalance(balance.toString());

      const credit = payload.available_credit || 0;
      setAvailableLimit(credit.toString());
      
      console.log('Balance:', balance, 'Available Credit:', credit);
    } else {
      Alert.alert('Error', 'Failed to load loan details');
    }

    // Fetch client data for approved loan limit
    const clientResponse = await fetch(
      `${API_BASE_URL}/api/clients/${activeClientId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const clientData = await clientResponse.json();
    console.log('Client data response:', clientData);

    if (clientResponse.ok && clientData.client) {
      const approvedLimit = clientData.client.approved_loan_limit || 0;
      setApprovedLoanLimit(approvedLimit.toString());
      console.log('Approved Limit:', approvedLimit);
    }

  } catch (error) {
    console.error('Error fetching loan details:', error);
    Alert.alert('Error', 'Failed to load loan details');
  } finally {
    setLoading(false);
  }
};

  const handleEdit = () => {
    setIsEditable(true);
  };

  const validateAmount = () => {
    const amount = parseFloat(appliedAmount);
    const limit = parseFloat(availableLimit);

    if (!appliedAmount || appliedAmount.trim() === '') {
      Alert.alert('Error', 'Please enter a loan amount');
      return false;
    }

    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return false;
    }

    if (amount > limit) {
      Alert.alert(
        'Error', 
        `The amount exceeds your available limit of Ksh ${limit}`
      );
      return false;
    }

    return true;
  };

  const handleApply = async () => {
    if (!validateAmount()) return;

    Alert.alert(
      'Confirm Application',
      `You are applying for a loan of Ksh ${appliedAmount}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm', 
          onPress: submitLoanApplication 
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Application',
      'Are you sure you want to cancel this loan application?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => router.back()
        },
      ]
    );
  };

  const submitLoanApplication = async () => {
  setSubmitting(true);
  try {
    let token = await AsyncStorage.getItem('token');
    if (!token) {
      token = await AsyncStorage.getItem('access_token') || await AsyncStorage.getItem('userToken');
    }

    // Get client_id
    let activeClientId = clientId;
    if (!activeClientId) {
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const user = JSON.parse(storedUserData);
        activeClientId = user.id;
      }
    }

    // Create form data
    const formData = new FormData();
    formData.append('amount', appliedAmount);
    formData.append('client_id', activeClientId);
    formData.append('currentBalance', currentBalance);

    const response = await fetch(`${API_BASE_URL}/api/loans/requests/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type, let the browser set it with boundary
      },
      body: formData,
    });

    const data = await response.json();

    if (response.ok) {
      Alert.alert(
        'Success',
        'Your loan application has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Error', data.message || 'Failed to submit loan application');
    }
  } catch (error) {
    console.error('Error submitting loan:', error);
    Alert.alert('Error', 'Network error. Please try again.');
  } finally {
    setSubmitting(false);
  }
};

  const formatCurrency = (value) => {
    if (!value) return '';
    
    const numericValue = value.replace(/[^0-9.]/g, '');
    return numericValue;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apply new loan</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply new loan</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Form Card */}
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Loan Application Form</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={16} color="#2563EB" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Current Loan Balance Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Current Loan Balance Amount</Text>
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={currentBalance}
              onChangeText={(text) => setCurrentBalance(formatCurrency(text))}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#999"
              editable={isEditable}
            />
          </View>

          {/* Available Limit */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Available Limit</Text>
            <View style={[styles.input, styles.limitContainer]}>
              <Text style={styles.limitText}>{availableLimit}</Text>
            </View>
          </View>

          {/* Approved Loan Limit */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Approved Loan Limit</Text>
            <View style={[styles.input, styles.approvedLimitContainer]}>
              <Text style={styles.approvedLimitText}>{approvedLoanLimit}</Text>
            </View>
          </View>

          {/* Applied Loan Amount */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Applied Loan Amount</Text>
            <TextInput
              style={[styles.input, styles.appliedAmountInput]}
              value={appliedAmount}
              onChangeText={(text) => setAppliedAmount(formatCurrency(text))}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor="#999"
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={submitting}
            >
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.applyButton, submitting && styles.applyButtonDisabled]}
              onPress={handleApply}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFF" />
                  <Text style={styles.applyButtonText}>Apply</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
    backgroundColor: '#2563EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  limitContainer: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  limitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
  },
  approvedLimitContainer: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  approvedLimitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  appliedAmountInput: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyButtonDisabled: {
    opacity: 0.6,
  },
  applyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});