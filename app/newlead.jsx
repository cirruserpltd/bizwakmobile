import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

const NewLead = () => {
  const navigation = useNavigation();

  const [formData, setFormData] = useState({
    date: '',
    surname: '',
    other_names: '',
    phoneNumber: '',
    location: '',
    branch: '',            
    productOfInterest: '', 
    leadSource: '',        
    bde: ''                
  });

  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [bdes, setBdes] = useState([]);
  const [leadSources] = useState([
    'Manual',
    'Referral',
    'Walk-in',
    'Marketting Campaign'
  ]);

  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showBdePicker, setShowBdePicker] = useState(false);
  const [showLeadSourcePicker, setShowLeadSourcePicker] = useState(false);

  useEffect(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    setFormData(prev => ({ ...prev, date: formattedDate }));
  }, []);

  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        console.log("Fetching dropdown data with token:", token);

        
        const branchesResp = await fetch(`${API_BASE_URL}/api/branches`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const branchesData = await branchesResp.json();
        if (branchesResp.ok) setBranches(branchesData.payload || []);

        
        const productsResp = await fetch(`${API_BASE_URL}/api/products/individual`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const productsData = await productsResp.json();
        if (productsResp.ok) setProducts(productsData.payload || []);

        
        const bdesResp = await fetch(`${API_BASE_URL}/api/users`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
         }
        });
        
        const bdesData = await bdesResp.json();
        // console.log("Fetched BDEs:", JSON.stringify(bdesData.payload, null, 2));

        if (bdesResp.ok) setBdes(bdesData.payload || []);

      } catch (error) {
        console.error("Error fetching dropdown data:", error);
      }
    };

    fetchDropdownData();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    console.log("handleSubmit called");
    try {
      const token = await AsyncStorage.getItem("token");
      console.log("Token being sent:", token);

      if (!token) {
        alert("You are not logged in. Please login first.");
        return;
      }

      // Validate required fields
      if (
        !formData.surname.trim() ||
        !formData.other_names.trim() ||
        !formData.phoneNumber.trim() ||
        !formData.branch ||
        !formData.productOfInterest ||
        !formData.bde
      ) {
        alert("Please fill all required fields and select options.");
        return;
      }

      const selectedBranch = branches.find(b => String(b.id) === String(formData.branch));
      const selectedProduct = products.find(p => String(p.id) === String(formData.productOfInterest));
      console.log("formData.bde value:", formData.bde);
      console.log("Available BDEs:", bdes.map(b => ({ id: b.id, name: b.name })));

      const selectedBde = bdes.find(b => String(b.id) === String(formData.bde));

      console.log("Matched branch:", selectedBranch);
      console.log("Matched product:", selectedProduct);
      console.log("Matched BDE:", selectedBde);

      
      if (!selectedBranch || !selectedProduct || !selectedBde) {
        alert("Invalid branch, product, or BDE selection. Please reselect.");
        return;
      }

      const payload = {
        surname: formData.surname.trim(),
        other_names: formData.other_names.trim(),
        phone: formData.phoneNumber.trim(),
        branch_id: selectedBranch.id,
        product_id: selectedProduct.id,
        lead_bde: selectedBde.id,
        location_description: formData.location?.trim() || "",
        lead_source: formData.leadSource || "Manual", 
        created_at: formData.date || new Date().toISOString()
      };

      console.log("Payload being sent:", payload);

      const API_URL = `${API_BASE_URL}/client/new/create-lead`;
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      if (!response.ok) {
        console.error("Server error:", response.status, text);
        alert(`Error ${response.status}: Failed to submit lead`);
        return;
      }

      const data = JSON.parse(text);

      console.log("Lead created successfully:", data);
      alert("Lead submitted successfully!");
      navigation.goBack();

    } catch (error) {
      console.error("Error submitting lead:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  // Separate render function for Lead Source dropdown (handles strings instead of objects)
  const renderLeadSourceDropdown = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>Lead Source</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowLeadSourcePicker(!showLeadSourcePicker)}
      >
        <Text style={formData.leadSource ? styles.dropdownText : styles.placeholderText}>
          {formData.leadSource || '- Select Lead Source - -'}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>
      {showLeadSourcePicker && (
        <View style={styles.pickerContainer}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {leadSources.map((source, index) => (
              <TouchableOpacity
                key={index}
                style={styles.pickerItem}
                onPress={() => {
                  handleInputChange('leadSource', source); // ✅ Store the actual string
                  setShowLeadSourcePicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{source}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const renderDropdown = (label, value, placeholder, options, showPicker, setShowPicker, field) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdown}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={value ? styles.dropdownText : styles.placeholderText}>
          {value ? options.find(o => String(o.id) === String(value))?.name || placeholder : placeholder}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>
      {showPicker && (
        <View style={styles.pickerContainer}>
          <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.pickerItem}
                onPress={() => {
                  handleInputChange(field, option.id);
                  setShowPicker(false);
                }}
              >
                <Text style={styles.pickerItemText}>{option.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A90E2" />

      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('actions')}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Customer</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Surname</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter surname"
            placeholderTextColor="#999"
            value={formData.surname}
            onChangeText={(text) => handleInputChange('surname', text)}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Other Names</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter other names"
            placeholderTextColor="#999"
            value={formData.other_names}
            onChangeText={(text) => handleInputChange('other_names', text)}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(text) => handleInputChange('phoneNumber', text)}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter location"
            placeholderTextColor="#999"
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
          />
        </View>

        {renderDropdown('Branch', formData.branch, '- Select Branch - -', branches, showBranchPicker, setShowBranchPicker, 'branch')}
        {renderDropdown('Product of Interest', formData.productOfInterest, '- Select Product - -', products, showProductPicker, setShowProductPicker, 'productOfInterest')}
        {renderLeadSourceDropdown()}
        {renderDropdown('BDE', formData.bde, '- Select BDE - -', bdes, showBdePicker, setShowBdePicker, 'bde')}

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Date</Text>
          <View style={styles.dateInputContainer}>
            <Text style={styles.dateText}>{formData.date}</Text>
            <Text style={styles.calendarIcon}>📅</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit Lead</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { backgroundColor: '#4A90E2', flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 15, paddingHorizontal: 15 },
  backButton: { marginRight: 15 },
  backIcon: { color: '#FFF', fontSize: 24, fontWeight: '600' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  scrollView: { flex: 1, padding: 20 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: '#333' },
  dateInputContainer: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateText: { fontSize: 14, color: '#333' },
  calendarIcon: { fontSize: 18 },
  dropdown: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 14, color: '#333' },
  placeholderText: { fontSize: 14, color: '#999' },
  dropdownIcon: { fontSize: 10, color: '#666' },
  pickerContainer: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, marginTop: 5, maxHeight: 200 },
  pickerItem: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  pickerItemText: { fontSize: 14, color: '#333' },
  submitButton: { backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 15, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default NewLead;