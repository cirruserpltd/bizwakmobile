import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, StatusBar, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

export default function ClientFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const clientId = params.clientId;
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState(null);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [teams, setTeams] = useState([]);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);


  
  const [formData, setFormData] = useState({
    surname: '',
    other_names: '',
    dob: '',
    phone: '',
    alt_phone_no: '',
    id_no: '',
    alias: '',
    branch_id: '',
    im_team_id: '',
    gender: 'Male',
    marital_status: '',
    created_at: new Date().toLocaleDateString('en-GB'),
    business_name: '',
    business_type: '',
    category: '',
    business_size: '',
    is_registered: '',
    is_licensed: '',
    other_licenses: '',
    ownership: '',
    town: '',
    county: '',
    village: '',
    building_name: '',
    floor_no: '',
    door_no: '',
    detailed_address: '',
    indi_lat_gprs_coordinates: '',
    indi_long_gprs_coordinates: '',
    agreement_one: '',
    agreement_two: '',
    agreement_three: '',
    guarantor_name: '',
    guarantor_id: '',
    guarantor_phone: '',
    guarantor_location: '',
    guarantor_nearest_landmark: '',
    guarantor_business_location: '',
    guarantor_lat: '',
    guarantor_long: '',
    guarantor_max_amount: '',
    requested_amount: '',
    branch_limit: '',
    current_limit: '',
    average_score: ''
  });

  const [nextOfKinList, setNextOfKinList] = useState([{
    id: 1,
    name: '',
    location: '',
    phone: '',
    relationship: ''
  }]);

  const [dependants, setDependants] = useState([{
    id: 1,
    name: '',
    age: ''
  }]);
  const addDependant = () => {
  setDependants([...dependants, {
    id: dependants.length + 1,
    name: '',
    age: ''
  }]);
};

const updateDependant = (id, field, value) => {
  setDependants(dependants.map(dep => 
    dep.id === id ? { ...dep, [field]: value } : dep
  ));
};

const removeDependant = (id) => {
  if (dependants.length > 1) {
    setDependants(dependants.filter(dep => dep.id !== id));
  }
};
  const [perishableStock, setPerishableStock] = useState([{
    id: 1,
    product_name: '',
    quantity: '',
    unit_of_measure: '',
    price_per_unit: '',
    total_value: ''
  }]);
  const [nonPerishableStock, setNonPerishableStock] = useState([{
    id: 1,
    product_name: '',
    quantity: '',
    unit_of_measure: '',
    price_per_unit: '',
    total_value: ''
  }]);
  const [assetItems, setAssetItems] = useState([{
    id: 1,
    product_name: '',
    quantity: '',
    unit_of_measure: '',
    price_per_unit: '',
    total_value: ''
  }]);
  const [assets, setAssets] = useState([{
    id: 1,
    asset_name: '',
    brand_model: '',
    serial_no: '',
    description: '',
    condition: '',
    value: ''
  }]);
  const [businessChecks, setBusinessChecks] = useState({
    client_forthcoming: '',
    active_sales_activities: '',
    premises_well_kept: '',
    would_lend: '',
    any_other_biz_checks_info: ''
  });
  const [homeChecks, setHomeChecks] = useState({
    client_nervous_within_home: '',
    item_persons_proving_ownership: '',
    item_or_persons_description: '',
    spouse_awareness: '',
    suspicious_activity: '',
    any_other_home_checks_info: ''
  });
  const [guarantors, setGuarantors] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState({});

  const calculateItemTotal = (quantity, pricePerUnit) => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(pricePerUnit) || 0;
    return (qty * price).toFixed(2);
  };
  const calculateArrayTotal = (items) => {
    return items.reduce((sum, item) => {
      const total = parseFloat(item.total_value) || 0;
      return sum + total;
    }, 0).toFixed(2);
  };
  const calculateChattelsTotal = () => {
    return assets.reduce((sum, asset) => {
      const value = parseFloat(asset.value) || 0;
      return sum + value;
    }, 0).toFixed(2);
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
  const fetchBranchesAndTeams = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      // Fetch branches
      const branchesResp = await fetch(`${API_BASE_URL}/api/branches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const branchesData = await branchesResp.json();
      if (branchesResp.ok) setBranches(branchesData.payload || []);

      // Fetch teams
      const teamsResp = await fetch(`${API_BASE_URL}/users/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const teamsData = await teamsResp.json();
      if (teamsResp.ok) setTeams(teamsData.teams || []);
      else console.warn("Failed to fetch teams:", teamsData.message);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  fetchBranchesAndTeams();
}, []);


  const loadInitialData = async () => {
    try {
      setLoading(true);
      await fetchBusinessTypes();
      if (clientId) {
        await fetchClientData(clientId);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      Alert.alert('Error', 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  };

  const fetchBusinessTypes = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/business-types`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success) {
        setBusinessTypes(result.data);
      }
    } catch (error) {
      console.error('Error fetching business types:', error);
    }
  };

  const fetchClientData = async (id) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/api/mobile/clients/${id}/details`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.client) {
        const clientData = result.client;
        setClient(clientData);
        
        // Pre-populate Step 2 business data from assessment
        const businessData = clientData.business_types_data || [];
        if (businessData.length > 0) {
          const firstBusiness = businessData[0];
          setFormData(prev => ({
            ...prev,
            surname: clientData.name?.split(' ')[0] || '',
            other_names: clientData.name?.split(' ').slice(1).join(' ') || '',
            dob: clientData.dob || '',
            phone: clientData.phone || '',
            alt_phone_no: clientData.alt_phone_no || '',
            id_no: clientData.id_no || '',
            alias: clientData.alias || '',
            branch_id: clientData.branch_id?.toString() || '',
            im_team_id: clientData.im_team_id?.toString() || '',
            gender: clientData.gender || 'Male',
            marital_status: clientData.marital_status || '',
            // Pre-fill business data from assessment
            business_name: firstBusiness.business_name || '',
            business_type: firstBusiness.business_type || '',
            category: firstBusiness.category || '',
            business_size: firstBusiness.business_size || '',
            is_registered: firstBusiness.is_registered || '',
            is_licensed: firstBusiness.is_licensed || '',
            other_licenses: firstBusiness.other_licenses || '',
            ownership: firstBusiness.ownership || '',
            town: clientData.town || '',
            county: clientData.county || '',
            village: clientData.village || '',
            building_name: clientData.building_name || '',
            floor_no: clientData.floor_no || '',
            door_no: clientData.door_no || '',
            detailed_address: clientData.detailed_address || '',
            requested_amount: clientData.requested_amount?.toString() || '',
            branch_limit: clientData.branch_limit?.toString() || '',
            current_limit: clientData.loan_limit?.toString() || '',
            average_score: clientData.average_score?.toString() || '',
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            surname: clientData.name?.split(' ')[0] || '',
            other_names: clientData.name?.split(' ').slice(1).join(' ') || '',
            dob: clientData.dob || '',
            phone: clientData.phone || '',
            alt_phone_no: clientData.alt_phone_no || '',
            id_no: clientData.id_no || '',
            alias: clientData.alias || '',
            branch_id: clientData.branch_id?.toString() || '',
            im_team_id: clientData.im_team_id?.toString() || '',
            gender: clientData.gender || 'Male',
            marital_status: clientData.marital_status || '',
            town: clientData.town || '',
            county: clientData.county || '',
            village: clientData.village || '',
            building_name: clientData.building_name || '',
            floor_no: clientData.floor_no || '',
            door_no: clientData.door_no || '',
            detailed_address: clientData.detailed_address || '',
            requested_amount: clientData.requested_amount?.toString() || '',
            branch_limit: clientData.branch_limit?.toString() || '',
            current_limit: clientData.loan_limit?.toString() || '',
            average_score: clientData.average_score?.toString() || '',
          }));
        }
        
        if (clientData.next_of_kin) {
          setNextOfKinList([{
            id: 1,
            name: clientData.next_of_kin.name || '',
            location: clientData.next_of_kin.location || '',
            phone: clientData.next_of_kin.phone || '',
            relationship: clientData.next_of_kin.relationship || ''
          }]);
        }
        if (clientData.dependents) {
          setDependants(clientData.dependents);
        }
        if (clientData.home?.household_items) {
          setAssets(clientData.home.household_items);
        }
        if (clientData.onboarding_details?.[0]?.completed_steps) {
          setCompletedSteps(clientData.onboarding_details[0].completed_steps);
        }
        
        // Load existing stock data if available
        if (clientData.perishable_stock && clientData.perishable_stock.length > 0) {
          setPerishableStock(clientData.perishable_stock);
        }
        if (clientData.non_perishable_stock && clientData.non_perishable_stock.length > 0) {
          setNonPerishableStock(clientData.non_perishable_stock);
        }
        if (clientData.asset_items && clientData.asset_items.length > 0) {
          setAssetItems(clientData.asset_items);
        }
        if (clientData.business?.checks) {
          setBusinessChecks(clientData.business.checks);
        }
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
      Alert.alert('Error', 'Failed to load client data');
    }
  };
  const validateStep = (step) => {
    const errors = [];
    if (step === 1) {
      if (!formData.surname) errors.push('Surname is required');
      if (!formData.other_names) errors.push('Other names are required');
      if (!formData.phone) errors.push('Phone number is required');
      if (!formData.id_no) errors.push('ID number is required');
    }
    return errors;
  };

  const saveStep = async (step) => {
  try {
    setLoading(true);
    const token = await getAuthToken();
    
    const textFormData = new FormData();
    
    if (step === 1) {
      // Step 1: Personal Information
      textFormData.append('surname', formData.surname || '');
      textFormData.append('other_names', formData.other_names || '');
      textFormData.append('dob', formData.dob || '');
      textFormData.append('phone', formData.phone || '');
      textFormData.append('alt_phone_no', formData.alt_phone_no || '');
      textFormData.append('id_no', formData.id_no || '');
      textFormData.append('alias', formData.alias || '');
      textFormData.append('branch_id', formData.branch_id || '');
      textFormData.append('im_team_id', formData.im_team_id || '');
      textFormData.append('gender', formData.gender);
      textFormData.append('marital_status', formData.marital_status);
      textFormData.append('created_at', formData.created_at);
      
      // Next of Kin - match web app format
      if (nextOfKinList[0]) {
        textFormData.append('next_of_kin_name', nextOfKinList[0].name);
        textFormData.append('next_of_kin_location', nextOfKinList[0].location);
        textFormData.append('next_of_kin_phone', nextOfKinList[0].phone);
        textFormData.append('next_of_kin_relationship', nextOfKinList[0].relationship);
      }
      
      // Dependants
      textFormData.append('dependants', JSON.stringify(dependants));
    }
    
    if (step === 2) {
      // Business Types Data - FIXED to match web app format
      const businessTypesData = [{
        business_name: formData.business_name,
        business_type: formData.business_type,
        category: formData.category,
        business_size: formData.business_size.toLowerCase(), // Convert to lowercase
        business_owner: formData.ownership.toLowerCase(), // Changed from ownership to business_owner
        is_registered: formData.is_registered === 'Yes' ? '1' : '0', // Convert to 1/0
        is_licensed: formData.is_licensed === 'Yes' ? '1' : '0', // Convert to 1/0
        other_license: formData.other_licenses === 'Yes' ? '1' : '0', // Changed from other_licenses to other_license
        business_type_id: '', // Add if you have this value
        business_class_id: '', // Add if you have this value
        expected_profit: '' // Add if you have this value
      }];
      textFormData.append('business_types_data', JSON.stringify(businessTypesData));
      
      // Perishable Stock - FIXED format
      if (perishableStock.length > 0 && perishableStock[0].product_name) {
        const formattedPerishableStock = perishableStock.map(item => ({
          stock_name: item.product_name, // Changed from product_name to stock_name
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure,
          price_per_unit: item.price_per_unit
          // Remove total_value as web app doesn't include it
        }));
        textFormData.append('perishable_stock', JSON.stringify(formattedPerishableStock));
      }
      
      // Non-Perishable Stock - FIXED format
      if (nonPerishableStock.length > 0 && nonPerishableStock[0].product_name) {
        const formattedNonPerishableStock = nonPerishableStock.map(item => ({
          stock_name: item.product_name, // Changed from product_name to stock_name
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure,
          price_per_unit: item.price_per_unit
          // Remove total_value as web app doesn't include it
        }));
        textFormData.append('non_perishable_stock', JSON.stringify(formattedNonPerishableStock));
      }
      
      // Asset Items - FIXED format
      if (assetItems.length > 0 && assetItems[0].product_name) {
        const formattedAssetItems = assetItems.map((item, index) => ({
          asset_name: item.product_name, // Changed from product_name to asset_name
          quantity: item.quantity,
          price_per_unit: item.price_per_unit,
          asset_image: `asset_items_imgs_${index}` // Add image reference
          // Remove unit_of_measure and total_value
        }));
        textFormData.append('asset_items', JSON.stringify(formattedAssetItems));
      }
      
      // Business Checks - FIXED format with lowercase values
      if (Object.keys(businessChecks).length > 0) {
        const formattedBusinessChecks = {
          client_fourthcoming_with_info: businessChecks.client_forthcoming === 'Yes', // Fixed field name
          presence_of_active_sales: businessChecks.active_sales_activities === 'Yes',
          premises_well_kept: businessChecks.premises_well_kept === 'Yes',
          would_you_lend: businessChecks.would_lend === 'Yes',
          any_other_biz_checks_info: businessChecks.any_other_biz_checks_info || 'NONE'
        };
        textFormData.append('business_checks', JSON.stringify(formattedBusinessChecks));
      }
    }
    
    if (step === 3) {
      // Home Information
      textFormData.append('town', formData.town);
      textFormData.append('county', formData.county);
      textFormData.append('village', formData.village);
      textFormData.append('building_name', formData.building_name);
      textFormData.append('floor_no', formData.floor_no);
      textFormData.append('door_no', formData.door_no);
      textFormData.append('detailed_address', formData.detailed_address);
      textFormData.append('indi_lat_gprs_coordinates', formData.indi_lat_gprs_coordinates);
      textFormData.append('indi_long_gprs_coordinates', formData.indi_long_gprs_coordinates);
      
      // Home Assets (Chattels) - FIXED format
      if (assets.length > 0 && assets[0].asset_name) {
        const formattedAssets = assets.map((asset, index) => ({
          name: asset.asset_name, // Changed from asset_name to name
          brand: asset.brand_model, // Changed from brand_model to brand
          serial_no: asset.serial_no,
          description: asset.description,
          condition: asset.condition,
          value: asset.value,
          asset_image: `chattel_image_${index}` // Changed from chattle_imgs_* to chattel_image_*
        }));
        textFormData.append('assets', JSON.stringify(formattedAssets));
      }
      
      // Home Checks - FIXED format with lowercase values
      if (Object.keys(homeChecks).length > 0) {
        const formattedHomeChecks = {
          client_nervous_within_home: homeChecks.client_nervous_within_home === 'Yes',
          item_persons_proving_ownership: homeChecks.item_persons_proving_ownership === 'Yes',
          item_or_persons_description: homeChecks.item_or_persons_description || '',
          spouse_awareness: homeChecks.spouse_awareness === 'Yes',
          suspicious_activity: homeChecks.suspicious_activity === 'Yes',
          any_other_home_checks_info: homeChecks.any_other_home_checks_info || 'none'
        };
        textFormData.append('home_checks', JSON.stringify(formattedHomeChecks));
      }
    }
    
    if (step === 4) {
      // Agreement Checks - FIXED format with lowercase values
      const agreementChecks = {
        willing_to_sign: formData.agreement_one === 'Yes',
        understands_terms: formData.agreement_two === 'Yes',
        aware_consequences: formData.agreement_three === 'Yes'
      };
      textFormData.append('agreement_checks', JSON.stringify(agreementChecks));
      
      // Guarantor Details
      const guarantorDetails = [{
        name: formData.guarantor_name,
        id_number: formData.guarantor_id,
        phone: formData.guarantor_phone,
        location: formData.guarantor_location,
        business_location: formData.guarantor_business_location,
        lat: formData.guarantor_lat,
        long: formData.guarantor_long,
        max_amount: formData.guarantor_max_amount
      }];
      textFormData.append('guarantors', JSON.stringify(guarantorDetails));
    }
    
    if (step === 5) {
      // Affordability
      textFormData.append('requested_amount', formData.requested_amount);
      textFormData.append('branch_limit', formData.branch_limit);
      textFormData.append('current_limit', formData.current_limit);
      textFormData.append('average_score', formData.average_score);
      
      if (accounts.length > 0) {
        textFormData.append('accounts', JSON.stringify(accounts));
      }
    }
    
    console.log('Sending data for step', step);

    // Save text data
    const response = await fetch(
      `${API_BASE_URL}/clients/onboardindividual/${clientId}/step/${step}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: textFormData,
      }
    );

    const result = await response.json();
    console.log('Server response:', result);
    
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to save data');
      setLoading(false);
      return false;
    }

    if (result.payload) {
      setClient(result.payload);
    }

    // Upload files separately
    const hasFiles = await uploadStepFiles(step, token);
    
    if (hasFiles) {
      Alert.alert('Success', 'Data and files saved successfully');
    } else {
      Alert.alert('Success', 'Data saved successfully');
    }

    // Mark step as completed
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
    }

    return true;
  } catch (error) {
    console.error('Error saving step:', error);
    Alert.alert('Error', 'Failed to save data');
    return false;
  } finally {
    setLoading(false);
  }
};

  const uploadStepFiles = async (step, token) => {
  const fileFormData = new FormData();
  let hasFiles = false;

  // Map of step numbers to their required file fields
  const stepFileMapping = {
    1: {
      'profile_pic': 'profile_image',
      'id_front': 'id_front',
      'id_back': 'id_back',
      'client_sign_img': 'client_signature',
      'additional_documents1': 'additional_docs',
    },
    2: {
      'business_front_view': 'business_front_view',
      'business_visit_form': 'business_visit_form',
      'additional_business_pictures': 'business_additional_pics',
      'other_business_pictures': 'business_other_pics',
    },
    3: {
      'residence_front_view': 'residence_front_view',
      'checks_two_descp_img': 'ownership_proof_image',
    },
    4: {
      'client_agreement': 'client_agreement',
      'additional_documents1': 'additional_agreement_docs_1',
      'additional_documents2': 'additional_agreement_docs_2',
      'guarantor_sign_img_0': 'guarantor_signature',
      'guarantor_agreement_0': 'guarantor_agreement',
      'guarantor_pic_0': 'guarantor_passport',
      'guarantor_front_id_0': 'guarantor_id_front',
      'guarantor_back_id_0': 'guarantor_id_back',
    },
  };

  const fileMapping = stepFileMapping[step];
  if (!fileMapping) return false;

  // Add regular files
  for (const [backendKey, frontendKey] of Object.entries(fileMapping)) {
    if (uploadedFiles[frontendKey]) {
      const file = uploadedFiles[frontendKey];
      fileFormData.append(backendKey, {
        uri: file.uri,
        type: file.mimeType || 'image/jpeg',
        name: file.name || `${backendKey}.jpg`,
      });
      hasFiles = true;
    }
  }

  // Add asset item images for step 2
  if (step === 2) {
    assetItems.forEach((item, index) => {
      const fileKey = `asset_image_${item.id}`;
      if (uploadedFiles[fileKey]) {
        const file = uploadedFiles[fileKey];
        fileFormData.append(`asset_items_imgs_${index}`, {
          uri: file.uri,
          type: file.mimeType || 'image/jpeg',
          name: file.name || `asset_${index}.jpg`,
        });
        hasFiles = true;
      }
    });
  }

  // Add home asset images for step 3 - FIXED naming
  if (step === 3) {
    assets.forEach((asset, index) => {
      const fileKey = `asset_home_image_${asset.id}`;
      if (uploadedFiles[fileKey]) {
        const file = uploadedFiles[fileKey];
        // Changed from chattle_imgs_* to chattel_image_*
        fileFormData.append(`chattel_image_${index}`, {
          uri: file.uri,
          type: file.mimeType || 'image/jpeg',
          name: file.name || `home_asset_${index}.jpg`,
        });
        hasFiles = true;
      }
    });
  }

  if (!hasFiles) return false;

  try {
    const uploadResponse = await fetch(
      `${API_BASE_URL}/clients/onboardindividual/${clientId}/uploads/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: fileFormData,
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResult.success) {
      Alert.alert('Warning', 'Data saved but some files failed to upload');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error uploading files:', error);
    Alert.alert('Warning', 'Data saved but file upload failed');
    return false;
  }
};

  const handleFileUpload = async (fieldName) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',  
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('Selected file:', file); 
        setUploadedFiles(prev => ({
          ...prev,
          [fieldName]: {
            uri: file.uri,
            name: file.name,
            mimeType: file.mimeType || 'image/jpeg',
            size: file.size
          }
        }));
        Alert.alert('Success', `Image selected: ${file.name}`);
      } else if (result.type === 'success') {
        console.log('Selected file :', result); 
        setUploadedFiles(prev => ({
          ...prev,
          [fieldName]: {
            uri: result.uri,
            name: result.name,
            mimeType: result.mimeType || 'image/jpeg',
            size: result.size
          }
        }));
        Alert.alert('Success', `Image selected: ${result.name}`);
      } else {
        console.log('File selection cancelled');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleSubmit = async () => {
    console.log("Submitting form data:", formData);
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors.join('\n'));
      return;
    }
    
    const saved = await saveStep(currentStep);
    
    if (saved) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        Alert.alert('Success', 'Client onboarding completed successfully', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }
    }
  };

  const addNextOfKin = () => {
    setNextOfKinList([...nextOfKinList, {
      id: nextOfKinList.length + 1,
      name: '',
      location: '',
      phone: '',
      relationship: ''
    }]);
  };

  const updateNextOfKin = (id, field, value) => {
    setNextOfKinList(nextOfKinList.map(kin => 
      kin.id === id ? { ...kin, [field]: value } : kin
    ));
  };

  const addPerishableStock = () => {
    setPerishableStock([...perishableStock, {
      id: perishableStock.length + 1,
      product_name: '',
      quantity: '',
      unit_of_measure: '',
      price_per_unit: '',
      total_value: ''
    }]);
  };

  const updatePerishableStock = (id, field, value) => {
    setPerishableStock(perishableStock.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate total_value when quantity or price_per_unit changes
        if (field === 'quantity' || field === 'price_per_unit') {
          updatedItem.total_value = calculateItemTotal(
            field === 'quantity' ? value : item.quantity,
            field === 'price_per_unit' ? value : item.price_per_unit
          );
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addNonPerishableStock = () => {
    setNonPerishableStock([...nonPerishableStock, {
      id: nonPerishableStock.length + 1,
      product_name: '',
      quantity: '',
      unit_of_measure: '',
      price_per_unit: '',
      total_value: ''
    }]);
  };

  const updateNonPerishableStock = (id, field, value) => {
    setNonPerishableStock(nonPerishableStock.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate total_value when quantity or price_per_unit changes
        if (field === 'quantity' || field === 'price_per_unit') {
          updatedItem.total_value = calculateItemTotal(
            field === 'quantity' ? value : item.quantity,
            field === 'price_per_unit' ? value : item.price_per_unit
          );
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addAssetItem = () => {
    setAssetItems([...assetItems, {
      id: assetItems.length + 1,
      product_name: '',
      quantity: '',
      unit_of_measure: '',
      price_per_unit: '',
      total_value: ''
    }]);
  };

  const updateAssetItem = (id, field, value) => {
    setAssetItems(assetItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate total_value when quantity or price_per_unit changes
        if (field === 'quantity' || field === 'price_per_unit') {
          updatedItem.total_value = calculateItemTotal(
            field === 'quantity' ? value : item.quantity,
            field === 'price_per_unit' ? value : item.price_per_unit
          );
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const addAsset = () => {
    setAssets([...assets, {
      id: assets.length + 1,
      asset_name: '',
      brand_model: '',
      serial_no: '',
      description: '',
      condition: '',
      value: ''
    }]);
  };

  const updateAsset = (id, field, value) => {
    setAssets(assets.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const renderNumberButtons = () => (
    <View style={styles.numberButtons}>
      {[1, 2, 3, 4, 5].map((num) => (
        <TouchableOpacity 
          key={num} 
          style={[
            styles.numberButton, 
            num === currentStep && styles.activeNumberButton,
            completedSteps.includes(num) && styles.completedNumberButton
          ]}
          onPress={() => setCurrentStep(num)}
        >
          {completedSteps.includes(num) ? (
            <Ionicons name="checkmark" size={24} color="#fff" />
          ) : (
            <Text style={[
              styles.numberButtonText, 
              (num === currentStep || completedSteps.includes(num)) && styles.activeNumberButtonText
            ]}>
              {num}
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderImageUploadBox = (fieldName, label) => {
    const file = uploadedFiles[fieldName];
    
    return (
      <View style={styles.fullInput}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity 
          style={[styles.uploadBox, file && styles.uploadBoxWithImage]}
          onPress={() => handleFileUpload(fieldName)}
        >
          {file ? (
            <View style={styles.imagePreviewContainer}>
              <Image 
                source={{ uri: file.uri }} 
                style={styles.imagePreview}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.imageSelectedText}>Image Selected</Text>
                <Text style={styles.changeImageText}>Tap to change</Text>
              </View>
            </View>
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
              <Text style={styles.uploadText}>Choose Image</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderStep1 = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderNumberButtons()}
      <Text style={styles.sectionTitle}>Member personal information</Text>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Surname Name</Text>
          <TextInput
            style={styles.input}
            value={formData.surname}
            onChangeText={(text) => setFormData({...formData, surname: text})}
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Other Names</Text>
          <TextInput
            style={styles.input}
            value={formData.other_names}
            onChangeText={(text) => setFormData({...formData, other_names: text})}
          />
        </View>
      </View>
      
      <View style={styles.fullInput}>
        <Text style={styles.label}>Alias (Nickname)</Text>
        <TextInput
          style={styles.input}
          value={formData.alias}
          onChangeText={(text) => setFormData({...formData, alias: text})}
        />
      </View>


      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={formData.dob}
            placeholder="01/01/1994"
            onChangeText={(text) => setFormData({...formData, dob: text})}
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Phone No.</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>ID or Passport No.</Text>
        <TextInput
          style={styles.input}
          value={formData.id_no}
          onChangeText={(text) => setFormData({...formData, id_no: text})}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Created On</Text>
          <TextInput
            style={styles.input}
            value={formData.created_at}
            editable={false}
          />
        </View>
        <View style={styles.halfInput}>
        <Text style={styles.label}>Branch</Text>
        <TouchableOpacity 
          style={styles.dropdown}
          onPress={() => setShowBranchDropdown(!showBranchDropdown)}
        >
          <Text style={styles.dropdownText}>
            {formData.branch_name || 'Select'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        {showBranchDropdown && (
          <View style={styles.dropdownList}>
            {branches.length > 0 ? (
              branches.map((branch) => (
                <TouchableOpacity
                  key={branch.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setFormData({ ...formData, branch_id: branch.id.toString(), branch_name: branch.name });
                    setShowBranchDropdown(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{branch.name}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.dropdownItemText}>No branches found</Text>
            )}
          </View>
        )}
      </View>

      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Team</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowTeamDropdown(!showTeamDropdown)}
          >
            <Text style={styles.dropdownText}>
              {formData.team_name || 'Select'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>

          {showTeamDropdown && (
            <View style={styles.dropdownList}>
              {teams.length > 0 ? (
                teams.map((team) => (
                  <TouchableOpacity
                    key={team.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData({ ...formData, im_team_id: team.id.toString(), team_name: team.name });
                      setShowTeamDropdown(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{team.name}</Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.dropdownItemText}>No teams found</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.halfInput}>
          <Text style={styles.label}>Gender</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, gender: 'Male'})}
            >
              <View style={[styles.radio, formData.gender === 'Male' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, gender: 'Female'})}
            >
              <View style={[styles.radio, formData.gender === 'Female' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.fullInput}>
      <Text style={styles.label}>Marital Status</Text>
      <View style={styles.radioGroup}>
        {['Single', 'Married', 'Divorced', 'Widowed'].map((status) => (
        <TouchableOpacity
          key={status}
          style={styles.radioOption}
          onPress={() => setFormData({ ...formData, marital_status: status })}
        >
            <View
              style={[
                styles.radio,
                formData.marital_status === status && styles.radioSelected,
              ]}
            />
            <Text style={styles.radioLabel}>{status}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>


      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="checkmark" size={20} color="#fff" />
      </TouchableOpacity>

      <View style={styles.dependantsSection}>
        <Text style={styles.dependantsTitle}>Dependants & next of kin information</Text>
        <TouchableOpacity style={styles.addButton} onPress={addNextOfKin}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {nextOfKinList.map((kin, index) => (
        <View key={kin.id} style={styles.kinSection}>
          <Text style={styles.nextOfKinLabel}>Next Of Kin {index + 1}</Text>
          
          <View style={styles.fullInput}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={kin.name}
              onChangeText={(text) => updateNextOfKin(kin.id, 'name', text)}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Physical Location</Text>
              <TextInput
                style={styles.input}
                value={kin.location}
                onChangeText={(text) => updateNextOfKin(kin.id, 'location', text)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={kin.phone}
                onChangeText={(text) => updateNextOfKin(kin.id, 'phone', text)}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.fullInput}>
            <Text style={styles.label}>Relationship</Text>
            <TextInput
              style={styles.input}
              value={kin.relationship}
              onChangeText={(text) => updateNextOfKin(kin.id, 'relationship', text)}
            />
          </View>

          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      <View style={styles.dependantsSection}>
        <Text style={styles.dependantsTitle}>Dependants</Text>
        <TouchableOpacity style={styles.addButton} onPress={addDependant}>
          <Ionicons name="add-circle" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {dependants.map((dependant, index) => (
        <View key={dependant.id} style={styles.kinSection}>
          <View style={styles.dependantHeader}>
            <Text style={styles.nextOfKinLabel}>Dependant {index + 1}</Text>
            {dependants.length > 1 && (
              <TouchableOpacity onPress={() => removeDependant(dependant.id)}>
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={dependant.name}
                onChangeText={(text) => updateDependant(dependant.id, 'name', text)}
                placeholder="Enter name"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={dependant.age}
                onChangeText={(text) => updateDependant(dependant.id, 'age', text)}
                placeholder="Enter age"
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Save</Text>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.sectionTitle}>Documents</Text>
      <Text style={styles.uploadSubtitle}>Upload Files And Attachments</Text>
      
      {renderImageUploadBox('profile_image', 'Profile')}
      {renderImageUploadBox('id_front', 'ID Front')}
      {renderImageUploadBox('id_back', 'ID Back')}
      {renderImageUploadBox('client_signature', 'Client Signature')}
      {renderImageUploadBox('additional_docs', 'Additional Documents (Optional)')}

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderNumberButtons()}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleBlue}>Business Visits</Text>
        <TouchableOpacity style={styles.addButtonBlue}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subsectionTitle}>Business Types and Sizes</Text>


      <View style={styles.fullInput}>
        <Text style={styles.label}>Business Name</Text>
        <TextInput 
          style={styles.input} 
          value={formData.business_name}
          onChangeText={(text) => setFormData({...formData, business_name: text})}
          placeholder="Enter business name"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Business Type</Text>
          <TextInput 
            style={styles.input} 
            value={formData.business_type}
            onChangeText={(text) => setFormData({...formData, business_type: text})}
            placeholder="e.g., shoes plug"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Category</Text>
          <TextInput 
            style={styles.input} 
            value={formData.category}
            onChangeText={(text) => setFormData({...formData, category: text})}
            placeholder="e.g., retail"
          />
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>Average sales/Day (None)</Text>
        <TextInput 
          style={styles.input} 
          value={formData.average_sales_day}
          onChangeText={(text) => setFormData({...formData, average_sales_day: text})}
          placeholder="Enter average sales per day"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Registered</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, is_registered: 'Yes'})}
            >
              <View style={[styles.radio, formData.is_registered === 'Yes' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, is_registered: 'No'})}
            >
              <View style={[styles.radio, formData.is_registered === 'No' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Licensed</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, is_licensed: 'Yes'})}
            >
              <View style={[styles.radio, formData.is_licensed === 'Yes' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, is_licensed: 'No'})}
            >
              <View style={[styles.radio, formData.is_licensed === 'No' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Any Other Licenses?</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, other_licenses: 'Yes'})}
            >
              <View style={[styles.radio, formData.other_licenses === 'Yes' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, other_licenses: 'No'})}
            >
              <View style={[styles.radio, formData.other_licenses === 'No' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>No</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Business ownership</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, ownership: 'Sole'})}
            >
              <View style={[styles.radio, formData.ownership === 'Sole' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Sole</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, ownership: 'Partnership'})}
            >
              <View style={[styles.radio, formData.ownership === 'Partnership' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>Partnership</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.radioOption}
              onPress={() => setFormData({...formData, ownership: 'LimitedCo'})}
            >
              <View style={[styles.radio, formData.ownership === 'LimitedCo' && styles.radioSelected]} />
              <Text style={styles.radioLabel}>LimitedCo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={18} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleBlue}>Perishable Stock (eg Groceries)</Text>
        <TouchableOpacity style={styles.addButtonBlue} onPress={addPerishableStock}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {perishableStock.map((item, index) => (
        <View key={item.id}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput 
                style={styles.input}
                value={item.product_name}
                onChangeText={(text) => updatePerishableStock(item.id, 'product_name', text)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput 
                style={styles.input}
                value={item.quantity}
                onChangeText={(text) => updatePerishableStock(item.id, 'quantity', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Unit of Measure</Text>
              <TextInput 
                style={styles.input}
                value={item.unit_of_measure}
                onChangeText={(text) => updatePerishableStock(item.id, 'unit_of_measure', text)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Price per Unit</Text>
              <TextInput 
                style={styles.input}
                value={item.price_per_unit}
                onChangeText={(text) => updatePerishableStock(item.id, 'price_per_unit', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fullInput}>
            <Text style={styles.label}>Total Value</Text>
            <TextInput 
              style={styles.input}
              value={item.total_value}
              onChangeText={(text) => updatePerishableStock(item.id, 'total_value', text)}
              keyboardType="numeric"
            />
          </View>
        </View>
      ))}

      <View style={styles.fullInput}>
        <Text style={styles.label}>Total Perishable stock value</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{calculateArrayTotal(perishableStock)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={18} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleBlue}>Non-perishable Stock (eg Cereals)</Text>
        <TouchableOpacity style={styles.addButtonBlue} onPress={addNonPerishableStock}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {nonPerishableStock.map((item, index) => (
        <View key={item.id}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput 
                style={styles.input}
                value={item.product_name}
                onChangeText={(text) => updateNonPerishableStock(item.id, 'product_name', text)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput 
                style={styles.input}
                value={item.quantity}
                onChangeText={(text) => updateNonPerishableStock(item.id, 'quantity', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Unit of Measure</Text>
              <TextInput 
                style={styles.input}
                value={item.unit_of_measure}
                onChangeText={(text) => updateNonPerishableStock(item.id, 'unit_of_measure', text)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Price per Unit</Text>
              <TextInput 
                style={styles.input}
                value={item.price_per_unit}
                onChangeText={(text) => updateNonPerishableStock(item.id, 'price_per_unit', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fullInput}>
            <Text style={styles.label}>Total Value</Text>
            <TextInput 
              style={styles.input}
              value={item.total_value}
              onChangeText={(text) => updateNonPerishableStock(item.id, 'total_value', text)}
              keyboardType="numeric"
            />
          </View>
        </View>
      ))}

      <View style={styles.fullInput}>
        <Text style={styles.label}>Total Non-perishable stock value</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{calculateArrayTotal(nonPerishableStock)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={18} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitleBlue}>Business Asset Items</Text>
        <TouchableOpacity style={styles.addButtonBlue} onPress={addAssetItem}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {assetItems.map((item, index) => (
        <View key={item.id}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Product Name</Text>
              <TextInput 
                style={styles.input}
                value={item.product_name}
                onChangeText={(text) => updateAssetItem(item.id, 'product_name', text)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Quantity</Text>
              <TextInput 
                style={styles.input}
                value={item.quantity}
                onChangeText={(text) => updateAssetItem(item.id, 'quantity', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Unit of Measure</Text>
              <TextInput 
                style={styles.input}
                value={item.unit_of_measure}
                onChangeText={(text) => updateAssetItem(item.id, 'unit_of_measure', text)}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Price per Unit</Text>
              <TextInput 
                style={styles.input}
                value={item.price_per_unit}
                onChangeText={(text) => updateAssetItem(item.id, 'price_per_unit', text)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.fullInput}>
            <Text style={styles.label}>Total Value</Text>
            <TextInput 
              style={styles.input}
              value={item.total_value}
              onChangeText={(text) => updateAssetItem(item.id, 'total_value', text)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.fullInput}>
            <Text style={styles.label}>Asset Image</Text>
            <TouchableOpacity 
              style={styles.imageUploadBox}
              onPress={() => handleFileUpload(`asset_image_${item.id}`)}
            >
              <Ionicons name="cloud-upload-outline" size={24} color="#007AFF" />
              <Text style={styles.uploadTextBlue}>Choose Image</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.fullInput}>
        <Text style={styles.label}>Total Business asset value</Text>
        <View style={styles.readOnlyInput}>
          <Text style={styles.readOnlyText}>{calculateArrayTotal(assetItems)}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={18} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

      <Text style={styles.sectionTitleBlue}>Other business visit checks</Text>

      <Text style={styles.questionText}>1. Is the client forthcoming with information?</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, client_forthcoming: 'Yes'})}
        >
          <View style={[styles.radio, businessChecks.client_forthcoming === 'Yes' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, client_forthcoming: 'No'})}
        >
          <View style={[styles.radio, businessChecks.client_forthcoming === 'No' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>No</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.questionText}>2. Is there presence of active sales activities within client business premises?</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, active_sales_activities: 'Yes'})}
        >
          <View style={[styles.radio, businessChecks.active_sales_activities === 'Yes' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, active_sales_activities: 'No'})}
        >
          <View style={[styles.radio, businessChecks.active_sales_activities === 'No' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>No</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.questionText}>3. Is the premises well kept?</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, premises_well_kept: 'Yes'})}
        >
          <View style={[styles.radio, businessChecks.premises_well_kept === 'Yes' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, premises_well_kept: 'No'})}
        >
          <View style={[styles.radio, businessChecks.premises_well_kept === 'No' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>No</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.questionText}>4. Would you lend?</Text>
      <View style={styles.radioGroup}>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, would_lend: 'Yes'})}
        >
          <View style={[styles.radio, businessChecks.would_lend === 'Yes' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.radioOption}
          onPress={() => setBusinessChecks({...businessChecks, would_lend: 'No'})}
        >
          <View style={[styles.radio, businessChecks.would_lend === 'No' && styles.radioSelected]} />
          <Text style={styles.radioLabel}>No</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>5. Any other information?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={businessChecks.any_other_biz_checks_info || ''}
          onChangeText={(text) => setBusinessChecks({...businessChecks, any_other_biz_checks_info: text})}
          multiline
          numberOfLines={3}
        />
      </View>

      {renderImageUploadBox('business_front_view', '6. Business Front View Picture')}
      {renderImageUploadBox('business_additional_pics', '7. Additional Pictures (Optional)')}
      {renderImageUploadBox('business_other_pics', '8. Other Business Pictures (Optional)')}
      {renderImageUploadBox('business_visit_form', 'Business visit Form')}


      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep3 = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderNumberButtons()}

      <Text style={styles.sectionTitle}>Home Visit</Text>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Town</Text>
          <TextInput
            style={styles.input}
            value={formData.town}
            onChangeText={(text) => setFormData({...formData, town: text})}
            placeholder="Enter town"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>County</Text>
          <TextInput
            style={styles.input}
            value={formData.county}
            onChangeText={(text) => setFormData({...formData, county: text})}
            placeholder="Enter county"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Village/Estate</Text>
          <TextInput
            style={styles.input}
            value={formData.village}
            onChangeText={(text) => setFormData({...formData, village: text})}
            placeholder="Enter village/estate"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Name of Building</Text>
          <TextInput
            style={styles.input}
            value={formData.building_name}
            onChangeText={(text) => setFormData({...formData, building_name: text})}
            placeholder="Enter building name"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Floor</Text>
          <TextInput
            style={styles.input}
            value={formData.floor_no}
            onChangeText={(text) => setFormData({...formData, floor_no: text})}
            placeholder="Enter floor"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Door No.</Text>
          <TextInput
            style={styles.input}
            value={formData.door_no}
            onChangeText={(text) => setFormData({...formData, door_no: text})}
            placeholder="Enter door number"
          />
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>Detailed Location Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.detailed_address}
          onChangeText={(text) => setFormData({...formData, detailed_address: text})}
          placeholder="Enter detailed location"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>GPRS Coordinates (LAT)</Text>
        <TextInput
          style={styles.input}
          value={formData.indi_lat_gprs_coordinates}
          onChangeText={(text) => setFormData({...formData, indi_lat_gprs_coordinates: text})}
          placeholder="Enter latitude"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>GPRS Coordinates (LONG)</Text>
        <TextInput
          style={styles.input}
          value={formData.indi_long_gprs_coordinates}
          onChangeText={(text) => setFormData({...formData, indi_long_gprs_coordinates: text})}
          placeholder="Enter longitude"
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={styles.saveButtonWithIcon}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={20} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Chattels</Text>
      <Text style={styles.subsectionTitle}>Assets (Detailed description)</Text>

      <TouchableOpacity style={styles.addButtonBlue} onPress={addAsset}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {assets.map((asset) => (
        <View key={asset.id} style={styles.kinSection}>
          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Asset name</Text>
              <TextInput
                style={styles.input}
                value={asset.asset_name}
                onChangeText={(text) => updateAsset(asset.id, 'asset_name', text)}
                placeholder="Enter asset name"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Brand/Model</Text>
              <TextInput
                style={styles.input}
                value={asset.brand_model}
                onChangeText={(text) => updateAsset(asset.id, 'brand_model', text)}
                placeholder="Enter brand/model"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Serial No</Text>
              <TextInput
                style={styles.input}
                value={asset.serial_no}
                onChangeText={(text) => updateAsset(asset.id, 'serial_no', text)}
                placeholder="Enter serial number"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={asset.description}
                onChangeText={(text) => updateAsset(asset.id, 'description', text)}
                placeholder="Enter description"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Condition</Text>
              <TextInput
                style={styles.input}
                value={asset.condition}
                onChangeText={(text) => updateAsset(asset.id, 'condition', text)}
                placeholder="Enter condition"
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Value</Text>
              <TextInput
                style={styles.input}
                value={asset.value}
                onChangeText={(text) => updateAsset(asset.id, 'value', text)}
                placeholder="Enter value"
                keyboardType="numeric"
              />
            </View>
          </View>

          {renderImageUploadBox(`asset_home_image_${asset.id}`, 'Asset Image')}
        </View>
      ))}

      <View style={styles.fullInput}>
        <Text style={styles.label}>Total Chattels value</Text>
        <TextInput
          style={[styles.input, styles.totalValueInput]}
          value={calculateChattelsTotal()}
          editable={false}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={styles.saveButtonWithIcon}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={20} color="#fff" />
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Checks</Text>
      <Text style={styles.subsectionTitle}>Home Visits Checks</Text>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>1. Is the client nervous within his / her home?</Text>
        <View style={styles.radioRow}>
          {['Yes', 'No'].map(option => (
            <TouchableOpacity 
              key={option}
              style={styles.radioOptionHorizontal}
              onPress={() => setHomeChecks({...homeChecks, client_nervous_within_home: option})}
            >
              <View style={[styles.radio, homeChecks.client_nervous_within_home === option && styles.radioSelected]} />
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>2. Is there any item or persons that proves client owns the place?</Text>
        <View style={styles.radioRow}>
          {['Yes', 'No'].map(option => (
            <TouchableOpacity 
              key={option}
              style={styles.radioOptionHorizontal}
              onPress={() => setHomeChecks({...homeChecks, item_persons_proving_ownership: option})}
            >
              <View style={[styles.radio, homeChecks.item_persons_proving_ownership === option && styles.radioSelected]} />
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.questionText}>2(b). For (No. 2) if answer is yes, add description and image attachment below</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={homeChecks.item_or_persons_description || ''}
          onChangeText={(text) => setHomeChecks({...homeChecks, item_or_persons_description: text})}
          placeholder="Enter description"
          multiline
          numberOfLines={3}
        />
      </View>

      {renderImageUploadBox('ownership_proof_image', 'Ownership Proof Image')}

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>3. Is the spouse aware that client wants to take loan and use house items as security?</Text>
        <View style={styles.radioRow}>
          {['Yes', 'No'].map(option => (
            <TouchableOpacity 
              key={option}
              style={styles.radioOptionHorizontal}
              onPress={() => setHomeChecks({...homeChecks, spouse_awareness: option})}
            >
              <View style={[styles.radio, homeChecks.spouse_awareness === option && styles.radioSelected]} />
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>4. Is there any suspicious activity that would make you decline lending the money?</Text>
        <View style={styles.radioRow}>
          {['Yes', 'No'].map(option => (
            <TouchableOpacity 
              key={option}
              style={styles.radioOptionHorizontal}
              onPress={() => setHomeChecks({...homeChecks, suspicious_activity: option})}
            >
              <View style={[styles.radio, homeChecks.suspicious_activity === option && styles.radioSelected]} />
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>5. Any other information?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={homeChecks.any_other_home_checks_info || ''}
          onChangeText={(text) => setHomeChecks({...homeChecks, any_other_home_checks_info: text})}
          placeholder="Enter additional information"
          multiline
          numberOfLines={3}
        />
      </View>

      {renderImageUploadBox('residence_front_view', '6. Residence Front View Picture')}

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep4 = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderNumberButtons()}

      <Text style={styles.sectionTitleBlue}>Agreements</Text>
      <Text style={styles.subsectionTitle}>Agreement and Affidavit Checks</Text>

      <View style={styles.agreementQuestion}>
        <Text style={styles.agreementQuestionText}>1. Is the client willing to sign the agreement?</Text>
        <View style={styles.radioRow}>
          {['Yes', 'No'].map(option => (
            <TouchableOpacity 
              key={option}
              style={styles.radioOptionHorizontal}
              onPress={() => setFormData({...formData, agreement_one: option})}
            >
              <View style={[styles.radio, formData.agreement_one === option && styles.radioSelected]} />
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.agreementQuestion}>
        <Text style={styles.agreementQuestionText}>2. Does the client understand the agreement?</Text>
        <View style={styles.radioRow}>
          {['Yes', 'No'].map(option => (
            <TouchableOpacity 
              key={option}
              style={styles.radioOptionHorizontal}
              onPress={() => setFormData({...formData, agreement_two: option})}
            >
              <View style={[styles.radio, formData.agreement_two === option && styles.radioSelected]} />
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.agreementQuestion}>
        <Text style={styles.agreementQuestionText}>3. Is the client aware of the consequences of agreement breach?</Text>
        <View style={styles.radioRow}>
          {['Yes', 'No'].map(option => (
            <TouchableOpacity 
              key={option}
              style={styles.radioOptionHorizontal}
              onPress={() => setFormData({...formData, agreement_three: option})}
            >
              <View style={[styles.radio, formData.agreement_three === option && styles.radioSelected]} />
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={20} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

      <Text style={styles.sectionTitleBlue}>Uploads</Text>
      
      {renderImageUploadBox('client_agreement', 'Client Agreement (Affidavit)')}
      {renderImageUploadBox('additional_agreement_docs_1', 'Additional Documents (Optional)')}
      {renderImageUploadBox('additional_agreement_docs_2', 'Additional Documents (Optional)')}
      

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={20} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

       <Text style={styles.sectionTitleBlue}>Loan Guarantor Declaration</Text>


      <View style={styles.fullInput}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={formData.guarantor_name}
          onChangeText={(text) => setFormData({...formData, guarantor_name: text})}
          placeholder=""
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Id No</Text>
          <TextInput
            style={styles.input}
            value={formData.guarantor_id}
            onChangeText={(text) => setFormData({...formData, guarantor_id: text})}
            placeholder=""
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Phone No.</Text>
          <TextInput
            style={styles.input}
            value={formData.guarantor_phone}
            onChangeText={(text) => setFormData({...formData, guarantor_phone: text})}
            placeholder=""
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>Residential Village Or Estate</Text>
        <TextInput
          style={styles.input}
          value={formData.guarantor_location}
          onChangeText={(text) => setFormData({...formData, guarantor_location: text})}
          placeholder=""
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Nearest Landmark</Text>
          <TextInput
            style={styles.input}
            value={formData.guarantor_nearest_landmark}
            onChangeText={(text) => setFormData({...formData, guarantor_nearest_landmark: text})}
            placeholder=""
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Business Location</Text>
          <TextInput
            style={styles.input}
            value={formData.guarantor_business_location}
            onChangeText={(text) => setFormData({...formData, guarantor_business_location: text})}
            placeholder=""
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>GPRS Coordinates (LAT)</Text>
          <TextInput
            style={styles.input}
            value={formData.guarantor_lat}
            onChangeText={(text) => setFormData({...formData, guarantor_lat: text})}
            placeholder=""
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>GPRS Coordinates (LONG)</Text>
          <TextInput
            style={styles.input}
            value={formData.guarantor_long}
            onChangeText={(text) => setFormData({...formData, guarantor_long: text})}
            placeholder=""
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>Maximum Guaranteed Amount</Text>
        <TextInput
          style={[styles.input, styles.guaranteedAmountInput]}
          value={formData.guarantor_max_amount}
          onChangeText={(text) => setFormData({...formData, guarantor_max_amount: text})}
          placeholder=""
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={20} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

      <Text style={styles.sectionTitleBlue}>Loan Guarantor Attachments</Text>

      
      {renderImageUploadBox('guarantor_signature', 'Guarantor signature img')}
      {renderImageUploadBox('guarantor_agreement', 'Guarantor Agreement')}
      {renderImageUploadBox('guarantor_passport', 'Guarantor Passport Photo (Optional)')}
      {renderImageUploadBox('guarantor_id_front', 'Guarantor Front ID')}
      {renderImageUploadBox('guarantor_id_back', 'Guarantor Back ID')}

      <View style={styles.guarantorActions}>
        <TouchableOpacity style={styles.deleteGuarantorButton}>
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addGuarantorButton}>
          <Text style={styles.addGuarantorText}>Add Guarantor</Text>
          <Ionicons name="add-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep5 = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      {renderNumberButtons()}
      
      <Text style={styles.sectionTitleBlue}>Affordability</Text>

      <View style={styles.sectionHeader}>
        <Text style={styles.subsectionTitle}>Account Details</Text>
        <TouchableOpacity style={styles.addButtonBlue}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>Account Number</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          placeholder="Enter account number"
          keyboardType="numeric"
          editable={false}  
        />
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Overall Score (0 - 900)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Affordability/month</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Highest Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Lowest Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Does the client gamble?</Text>
          <TextInput
            style={styles.input}
            placeholder=""
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>No of MFIs (active loans)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Loan range amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Does client use MFI loans on business activities?</Text>
          <TextInput
            style={styles.input}
            placeholder=""
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save</Text>
        <Ionicons name="save-outline" size={20} color="#fff" style={{marginLeft: 6}} />
      </TouchableOpacity>

      <Text style={styles.sectionTitleBlue}>Recommendations</Text>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Client Requested Amount</Text>
          <TextInput
            style={styles.input}
            value={formData.requested_amount}
            onChangeText={(text) => setFormData({...formData, requested_amount: text})}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.halfInput}>
          <Text style={styles.label}>Recommended amount (Branch)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.affordabilityCard}>
        <View style={styles.affordabilityItem}>
          <Text style={styles.affordabilityLabel}>Calculated affordable Limit</Text>
          <Text style={styles.affordabilityValue}>0</Text>
        </View>
        <View style={styles.affordabilityDivider} />
        <View style={styles.affordabilityItem}>
          <Text style={styles.affordabilityLabel}>Approved Loan Limit</Text>
          <Text style={styles.affordabilityValueBold}>KSH 0.0</Text>
        </View>
      </View>

      <View style={styles.fullInput}>
        <Text style={styles.label}>Recommended amount (Input by QA)</Text>
        <TextInput
          style={[styles.input, styles.qaInputHighlight]}
          placeholder="Enter amount"
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Save</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch(currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Onboarding</Text>
      </View>
      {renderCurrentStep()}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 16,
    marginLeft: 12,
    color: '#000',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  numberButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  numberButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeNumberButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  completedNumberButton: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  numberButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  activeNumberButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
    color: '#000',
  },
  sectionTitleBlue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 24,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    marginTop: 8,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  halfInput: {
    width: '48%',
  },
  fullInput: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#000',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  dropdown: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: '#666',
  },
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  radioLabel: {
    fontSize: 14,
    color: '#000',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dependantsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  dependantsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    padding: 4,
  },
  addButtonBlue: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  kinSection: {
    marginBottom: 24,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nextOfKinLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    color: '#000',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  uploadBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  uploadText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  imageUploadBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  uploadTextBlue: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 32,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  readOnlyInput: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  questionText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
    marginTop: 8,
    fontWeight: '500',
    lineHeight: 20,
  },
  placeholder: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    marginTop: 24,
    textAlign: 'center',
  },
  checkboxGroup: {
    marginTop: 8,
    marginBottom: 16,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  subsectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  saveButtonWithIcon: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  imageUploadBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#999',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  chooseImageText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 8,
  },
  totalValueInput: {
    backgroundColor: '#E3F2FD',
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 12,
    lineHeight: 20,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOptionHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 40,
  },
  agreementQuestion: {
  marginBottom: 24,
  },
  agreementQuestionText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 12,
    lineHeight: 20,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOptionHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 40,
  },
  uploadLabel: {
    fontSize: 14,
    color: '#000',
    marginBottom: 8,
    fontWeight: '500',
  },
  uploadSubtextGray: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    textAlign: 'center',
  },
  guaranteedAmountInput: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  guarantorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 8,
  },
  deleteGuarantorButton: {
    padding: 8,
  },
  addGuarantorButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  addGuarantorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  dropdownList: {
  backgroundColor: '#fff',
  borderRadius: 8,
  marginTop: 4,
  borderWidth: 1,
  borderColor: '#ddd',
  elevation: 3,
  zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  affordabilityCard: {
  backgroundColor: '#E8F5E9',
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 2,
  flexDirection: 'row',
  justifyContent: 'space-around',
  alignItems: 'center',
  },
  affordabilityItem: {
    flex: 1,
    alignItems: 'center',
  },
  affordabilityDivider: {
    width: 1,
    height: 50,
    backgroundColor: '#C8E6C9',
    marginHorizontal: 20,
  },
  affordabilityLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  affordabilityValue: {
    fontSize: 24,
    color: '#000',
    fontWeight: '600',
  },
  affordabilityValueBold: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: '700',
  },
  qaInputHighlight: {
    borderColor: '#1976D2',
    borderWidth: 2,
    backgroundColor: '#E3F2FD',
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  uploadBoxWithImage: {
  padding: 0,
  overflow: 'hidden',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 150,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageSelectedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  changeImageText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  dependantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

});
