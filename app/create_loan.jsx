import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as ImagePicker from 'expo-image-picker';
import RNPickerSelect from 'react-native-picker-select';
import axios from 'axios';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

const LoanManagementForm = ({ navigation, route }) => {
  const router = useRouter();
  const { client_id, request_id } = useLocalSearchParams(); // ✅ Added request_id
  const clientId = client_id;
  const requestId = request_id; // ✅ Store request_id

  console.log("🧭 route param client_id:", client_id);
  console.log("🎫 route param request_id:", request_id); // ✅ Log it
  
  // Form type state
  const [formType, setFormType] = useState('loan'); 
  const [isEditable, setIsEditable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Common fields
  const [applicationDate, setApplicationDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [product, setProduct] = useState('');
  const [products, setProducts] = useState([]);
  const [approvedLoanLimit, setApprovedLoanLimit] = useState('');
  const [availableCredit, setAvailableCredit] = useState(0);
  const [requestedLoanAmount, setRequestedLoanAmount] = useState(''); 
  const [actualLoanLimit, setActualLoanLimit] = useState(''); 
  const [repaymentDuration, setRepaymentDuration] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [bde, setBde] = useState('');
  const [bdeOptions, setBdeOptions] = useState([]);
  const [creationNotes, setCreationNotes] = useState('');

  // Top Up specific fields
  const [currentLoanBalance, setCurrentLoanBalance] = useState('');
  const [availableTopUpLimit, setAvailableTopUpLimit] = useState('');
  const [currentLoanLimit, setCurrentLoanLimit] = useState('');


  useEffect(() => {
    console.log("🧭 route param client_id:", client_id);
    console.log("🪪 clientId:", clientId);

    if (!clientId) {
      console.log("⚠️ No clientId found, skipping fetch.");
      return;
    }

    console.log("✅ clientId available, fetching initial data...");
    fetchInitialData();
  }, [clientId]);

  useEffect(() => {
    if (formType === 'loan' && requestedLoanAmount) {
      validateLoanAmount(requestedLoanAmount);
    }
  }, [requestedLoanAmount, formType]);

  const fetchInitialData = async () => {
    console.log("✅ Fetching initial data for:", clientId);
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Token:', token);

      // --- Fetch available credit ---
      const creditResponse = await axios.get(
        `${API_BASE_URL}/api/loans/available-credit/${clientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('Credit response:', creditResponse.data);

      if (creditResponse.data.success) {
        const credit = creditResponse.data.available_credit;
        setAvailableCredit(credit);
        setCurrentLoanLimit(credit.toString());
      }

      // Fetch the client's approved loan limit from client data
      const clientResponse = await axios.get(
        `${API_BASE_URL}/api/clients/${clientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (clientResponse.data.client) {
        const approvedLimit = clientResponse.data.client.approved_loan_limit || 0;
        setApprovedLoanLimit(approvedLimit.toLocaleString());
      }

      // --- Fetch products ---
      const productsResp = await fetch(`${API_BASE_URL}/api/products/individual`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const productsData = await productsResp.json();
      console.log('📦 Products data:', productsData);

      if (productsResp.ok) {
        const formattedProducts = (productsData.payload || []).map((prod) => ({
          label: prod.name,
          value: prod.id,
        }));
        setProducts(formattedProducts);
      }

      // --- Fetch BDEs ---
      const bdesResp = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const bdesData = await bdesResp.json();
      console.log('👤 BDEs data:', bdesData);

      if (bdesResp.ok) {
        const formattedBdes = (bdesData.payload || []).map((bde) => ({
          label: bde.name,
          value: bde.id,
        }));
        setBdeOptions(formattedBdes);
      } else {
        console.warn('❌ Failed to fetch BDEs');
      }

    } catch (error) {
      console.error('💥 Error fetching initial data:', error);
      Alert.alert('Error', 'Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateLoanAmount = async (amount) => {
    if (!amount || isNaN(amount)) return;

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/loans/validate-amount/${clientId}`,
        { amount: parseFloat(amount) }
      );

      if (response.data.success) {
        if (!response.data.can_borrow) {
          Alert.alert('Credit Limit Exceeded', response.data.message);
        }
      }
    } catch (error) {
      console.error('Error validating loan amount:', error);
    }
  };

  const onDateChange = (selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setApplicationDate(selectedDate);
    }
  };

  const pickImage = async () => {
    if (!isEditable) {
      Alert.alert('Form Locked', 'Please enable edit mode to upload images');
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const toggleEditMode = () => {
    setIsEditable(!isEditable);
  };

  const validateForm = () => {
    if (!product) {
      Alert.alert('Validation Error', 'Please select a product');
      return false;
    }

    if (!requestedLoanAmount || parseFloat(requestedLoanAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid requested loan amount');
      return false;
    }

    if (!actualLoanLimit || parseFloat(actualLoanLimit) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid actual loan limit');
      return false;
    }

    if (!bde) {
      Alert.alert('Validation Error', 'Please select a BDE');
      return false;
    }

    return true;
  };

  const handleApprove = async () => {
    if (!validateForm()) return;

    Alert.alert(
      'Confirm Submission',
      `Are you sure you want to create this ${formType === 'loan' ? 'loan' : 'top-up'} application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            setSubmitting(true);
            try {
              const token = await AsyncStorage.getItem('token');
              if (!token) {
                Alert.alert('Error', 'Authentication token not found. Please log in again.');
                return;
              }

              const formData = new FormData();
              formData.append('requested_amount', requestedLoanAmount);
              formData.append('amount', actualLoanLimit);
              formData.append('product', product);
              formData.append('bdo_individual_loan_approval_id', bde);
              if (creationNotes) formData.append('creation_notes', creationNotes);

              if (requestId) {
                formData.append('loan_request_id', requestId);
                console.log('✅ Including loan_request_id:', requestId);
              }

              const response = await axios.post(
                `${API_BASE_URL}/api/loans/createnewindividualloans/${clientId}`,
                formData,
                {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (response.data.success) {
                const loanId = response.data.payload.id;

                if (selectedImage && formType === 'loan') {
                  const imageFormData = new FormData();
                  imageFormData.append('disbursement_form_img', {
                    uri: selectedImage.uri,
                    type: 'image/jpeg',
                    name: 'disbursement_form.jpg',
                  });

                  await axios.post(
                    `${API_BASE_URL}/loans/view/loan/profile/${loanId}/uploaddisbursementform`,
                    imageFormData,
                    {
                      headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`,
                      },
                    }
                  );
                }

                Alert.alert(
                  'Success',
                  `Loan ${response.data.payload.loan_number} created successfully`,
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert('Error', response.data.error || 'Failed to create loan');
              }
            } catch (error) {
              console.error('Error creating loan:', error);
              const errorMessage =
                error.response?.data?.error || 'Failed to create loan. Please try again.';
              Alert.alert('Error', errorMessage);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleDecline = () => {
    Alert.alert(
      'Confirm Cancel',
      'Are you sure you want to cancel? All entered data will be lost.',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => router.back(),
          style: 'destructive' 
        },
      ]
    );
  };

  const switchToTopUp = () => {
    setFormType('topup');
    Alert.alert('Info', 'Top-up functionality coming soon!');
  };

  const switchToLoan = () => {
    setFormType('loan');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {formType === 'loan' ? 'Create new loan' : 'Top Up'}
        </Text>
        <TouchableOpacity
          style={styles.topUpButton}
          onPress={formType === 'loan' ? switchToTopUp : switchToLoan}
        >
          <Text style={styles.topUpText}>
            {formType === 'loan' ? 'Top Up' : 'New Loan'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Form Header */}
        <View style={styles.formHeader}>
          <Text style={styles.formTitle}>
            {formType === 'loan' ? 'Loan Application Form' : 'Top Up Application Form'}
          </Text>
          <TouchableOpacity
            style={[
              styles.editButton,
              !isEditable && styles.editButtonActive
            ]}
            onPress={toggleEditMode}
          >
            <MaterialIcons
              name={isEditable ? 'edit' : 'lock'}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.editText}>
              {isEditable ? 'Edit' : 'Locked'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* 1. Application Date */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Application Date</Text>
            <TouchableOpacity
              style={[
                styles.dateInput,
                !isEditable && styles.inputDisabled
              ]}
              onPress={() => isEditable && setShowDatePicker(true)}
              disabled={!isEditable}
            >
              <Text style={styles.dateText}>
                {formatDate(applicationDate)}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
            <DateTimePickerModal
              isVisible={showDatePicker}
              mode="date"
              date={applicationDate}
              onConfirm={onDateChange}
              onCancel={() => setShowDatePicker(false)}
            />
          </View>

          {/* 2. Product */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Product *</Text>
            <View style={[
              styles.pickerWrapper,
              !isEditable && styles.inputDisabled
            ]}>
              <RNPickerSelect
                onValueChange={(value) => isEditable && setProduct(value)}
                items={products}
                value={product}
                style={pickerSelectStyles}
                placeholder={{ label: '-- Select Product --', value: '' }}
                disabled={!isEditable}
                Icon={() => (
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color="#666"
                    style={{ marginTop: 12, marginRight: 8 }}
                  />
                )}
              />
            </View>
          </View>

          {/* 3. Approved Loan Limit - Now visible with proper styling */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Approved Loan Limit (KES)</Text>
            <View style={styles.creditInfoBox}>
              <Ionicons name="cash-outline" size={24} color="#2196F3" />
              <Text style={styles.creditAmount}>
                KES {approvedLoanLimit || '0'}
              </Text>
            </View>
          </View>

          {/* 4. Available Credit */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Available Credit (KES)</Text>
            <View style={styles.creditInfoBox}>
              <Ionicons name="cash-outline" size={24} color="#4CAF50" />
              <Text style={styles.creditAmount}>
                KES {availableCredit.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* 5. Requested Loan Amount - Renamed from Actual Loan Amount */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Requested Loan Amount (KES) *</Text>
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={requestedLoanAmount}
              onChangeText={setRequestedLoanAmount}
              placeholder="Enter requested amount"
              keyboardType="numeric"
              editable={isEditable}
            />
          </View>

          {/* 6. Repayment Duration */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Repayment Duration (weeks) *</Text>
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={repaymentDuration}
              onChangeText={setRepaymentDuration}
              placeholder="Enter duration in weeks"
              keyboardType="numeric"
              editable={isEditable}
            />
          </View>

          {/* 7. Upload - Loan Disbursement Form */}
          {formType === 'loan' && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Loan Disbursement Form (Optional)
              </Text>
              <TouchableOpacity
                style={[
                  styles.uploadBox,
                  !isEditable && styles.uploadBoxDisabled
                ]}
                onPress={pickImage}
                disabled={!isEditable}
              >
                {selectedImage ? (
                  <View style={styles.imageSelected}>
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#4CAF50"
                    />
                    <Text style={styles.imageSelectedText}>Image selected</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={32} color="#999" />
                    <Text style={styles.uploadText}>Choose image</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* 8. BDE Dropdown */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>BDE (Branch Development Executive) *</Text>
            <View style={[
              styles.pickerWrapper,
              !isEditable && styles.inputDisabled
            ]}>
              <RNPickerSelect
                onValueChange={(value) => isEditable && setBde(value)}
                items={bdeOptions}
                value={bde}
                style={pickerSelectStyles}
                placeholder={{ label: '-- Select BDE --', value: '' }}
                disabled={!isEditable}
                Icon={() => (
                  <Ionicons
                    name="chevron-down"
                    size={20}
                    color="#666"
                    style={{ marginTop: 12, marginRight: 8 }}
                  />
                )}
              />
            </View>
          </View>

          {/* 9. Actual Loan Limit - New field added after BDE */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Actual Loan Amount (KES) *</Text>
            <TextInput
              style={[styles.input, !isEditable && styles.inputDisabled]}
              value={actualLoanLimit}
              onChangeText={setActualLoanLimit}
              keyboardType="numeric"
              editable={isEditable}
            />
          </View>

          {/* 10. Creation Notes */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Creation Notes (Optional)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                !isEditable && styles.inputDisabled
              ]}
              value={creationNotes}
              onChangeText={setCreationNotes}
              placeholder="Add any notes about this loan application"
              multiline
              numberOfLines={4}
              editable={isEditable}
            />
          </View> 

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.approveButton,
                submitting && styles.buttonDisabled
              ]}
              onPress={handleApprove}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.approveText}>Create Loan</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.declineButton,
                submitting && styles.buttonDisabled
              ]}
              onPress={handleDecline}
              disabled={submitting}
            >
              <Ionicons name="close" size={20} color="#D32F2F" />
              <Text style={styles.declineText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  topUpButton: {
    backgroundColor: '#8BC34A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  topUpText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  editButtonActive: {
    backgroundColor: '#FF9800',
  },
  editText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginTop: 8,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999999',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  creditInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 12,
  },
  creditAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  uploadBox: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  uploadBoxDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  uploadText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginTop: 8,
  },
  imageSelected: {
    alignItems: 'center',
  },
  imageSelectedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#FFCDD2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  declineText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    color: '#333',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#333',
    paddingRight: 30,
  },
  placeholder: {
    color: '#999',
  },
});

export default LoanManagementForm;