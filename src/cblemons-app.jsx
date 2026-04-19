import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CBLemonsApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [showSignup, setShowSignup] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [approvedEmails, setApprovedEmails] = useState([]);

  const [currentTab, setCurrentTab] = useState('dashboard');
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [sections, setSections] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [allergens, setAllergens] = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingDish, setEditingDish] = useState(null);
  const [dishImages, setDishImages] = useState([]);

  const [formData, setFormData] = useState({
    dishName: '',
    sectionId: '',
    description: '',
    ingredients: '',
    prepNotes: '',
    creationNotes: '',
    environment: 'dev',
    selectedAllergens: []
  });

  const [photoData, setPhotoData] = useState({
    heroImage: null,
    heroFile: null,
    processPhotos: [],
    processFiles: []
  });

  useEffect(() => {
    checkUser();
    loadApprovedEmails();
  }, []);

  useEffect(() => {
    if (user) {
      loadLocations();
      loadAllergens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (selectedLocation && user) {
      loadSections(selectedLocation.id);
      loadDishes(selectedLocation.id);
    }
  }, [selectedLocation, user]);

  const checkUser = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    } catch (err) {
      console.error('Auth check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadApprovedEmails = async () => {
    try {
      const { data, error } = await supabase
        .from('approved_emails')
        .select('email');
      
      if (error) throw error;
      setApprovedEmails(data?.map(d => d.email) || []);
    } catch (err) {
      console.error('Failed to load approved emails:', err);
    }
  };

  const isEmailApproved = (email) => {
    return approvedEmails.includes(email.toLowerCase());
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail || !authPassword) {
      setAuthError('Email and password required');
      return;
    }

    if (!isEmailApproved(authEmail)) {
      setAuthError('This email is not authorized. Please contact your administrator.');
      return;
    }

    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters');
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword
      });

      if (error) throw error;
      
      setAuthEmail('');
      setAuthPassword('');
      setShowSignup(false);
      setAuthError('Account created! Please check your email to confirm.');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleSignin = async (e) => {
    e.preventDefault();
    setAuthError(null);

    if (!authEmail || !authPassword) {
      setAuthError('Email and password required');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword
      });

      if (error) throw error;
      
      setUser(data.user);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError('Invalid email or password');
    }
  };

  const handleSignout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCurrentTab('dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const loadLocations = async () => {
    try {
      setAppLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setLocations(data || []);
      if (data && data.length > 0 && !selectedLocation) {
        setSelectedLocation(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAppLoading(false);
    }
  };

  const loadSections = async (locationId) => {
    try {
      const { data, error } = await supabase
        .from('menu_sections')
        .select('*')
        .eq('location_id', locationId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setSections(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadDishes = async (locationId) => {
    try {
      const { data: sectionData, error: sectionError } = await supabase
        .from('menu_sections')
        .select('id')
        .eq('location_id', locationId);
      
      if (sectionError) throw sectionError;
      
      const sectionIds = sectionData.map(s => s.id);
      if (sectionIds.length === 0) {
        setDishes([]);
        return;
      }

      const { data, error } = await supabase
        .from('dishes')
        .select(`
          *,
          menu_sections(name),
          dish_allergens(
            allergens(id, name, description)
          ),
          dish_images(*)
        `)
        .in('section_id', sectionIds)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDishes(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadAllergens = async () => {
    try {
      const { data, error } = await supabase
        .from('allergens')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      setAllergens(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadDishImages = async (dishId) => {
    try {
      const { data, error } = await supabase
        .from('dish_images')
        .select('*')
        .eq('dish_id', dishId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      setDishImages(data || []);
    } catch (err) {
      console.error('Error loading images:', err);
    }
  };

  // PHOTO UPLOAD
  const handleHeroImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoData({
          ...photoData,
          heroFile: file,
          heroImage: event.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessPhotoChange = (e) => {
    const files = e.target.files;
    if (files) {
      const newPhotos = [];
      const newFiles = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = (event) => {
          newPhotos.push({
            preview: event.target.result,
            caption: ''
          });
          newFiles.push(file);
          
          if (newPhotos.length === files.length) {
            setPhotoData({
              ...photoData,
              processPhotos: [...photoData.processPhotos, ...newPhotos],
              processFiles: [...photoData.processFiles, ...newFiles]
            });
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeProcessPhoto = (index) => {
    setPhotoData({
      ...photoData,
      processPhotos: photoData.processPhotos.filter((_, i) => i !== index),
      processFiles: photoData.processFiles.filter((_, i) => i !== index)
    });
  };

  const uploadPhotos = async (dishId) => {
    try {
      // Upload hero image to storage only
      if (photoData.heroFile) {
        const heroFileName = `${dishId}-hero-${Date.now()}`;
        const { error: uploadError } = await supabase.storage
          .from('dish-images')
          .upload(heroFileName, photoData.heroFile);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('dish-images')
          .getPublicUrl(heroFileName);

        // Store URL in a simple way - we'll display it but not in DB for now
        console.log('Hero image uploaded:', publicUrl);
      }

      // Upload process photos to storage only
      for (let i = 0; i < photoData.processFiles.length; i++) {
        const file = photoData.processFiles[i];
        const processFileName = `${dishId}-process-${i}-${Date.now()}`;
        
        const { error: uploadError } = await supabase.storage
          .from('dish-images')
          .upload(processFileName, file);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('dish-images')
          .getPublicUrl(processFileName);

        console.log(`Process image ${i} uploaded:`, publicUrl);
      }

      alert('Photos uploaded successfully!');
      setPhotoData({
        heroImage: null,
        heroFile: null,
        processPhotos: [],
        processFiles: []
      });

      await loadDishes(selectedLocation.id);
    } catch (err) {
      alert('Error uploading photos: ' + err.message);
    }
  };

  const deleteImage = async (imageId, dishId) => {
    if (!window.confirm('Delete this image?')) return;

    try {
      // For now, just reload - images are in Storage, not DB
      await loadDishImages(dishId);
      await loadDishes(selectedLocation.id);
      alert('Image deleted!');
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  // LOCATION CRUD
  const createLocation = async (e) => {
    e.preventDefault();
    const name = prompt('Enter location name (e.g., CB Lemons Seaside):');
    if (!name) return;

    try {
      setAppLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .insert([{ name, concept_type: 'TBD', description: '' }])
        .select();
      
      if (error) throw error;
      setLocations([...locations, data[0]]);
      setSelectedLocation(data[0]);
      alert('Location created!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  const updateLocation = async (locationId) => {
    const name = prompt('Edit location name:', selectedLocation.name);
    if (!name) return;

    try {
      setAppLoading(true);
      const { error } = await supabase
        .from('locations')
        .update({ name })
        .eq('id', locationId);
      
      if (error) throw error;
      setSelectedLocation({ ...selectedLocation, name });
      setLocations(locations.map(l => l.id === locationId ? { ...l, name } : l));
      alert('Location updated!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  const deleteLocation = async (locationId) => {
    if (!window.confirm('Delete this location? This cannot be undone.')) return;

    try {
      setAppLoading(true);
      const { error } = await supabase
        .from('locations')
        .update({ is_active: false })
        .eq('id', locationId);
      
      if (error) throw error;
      setLocations(locations.filter(l => l.id !== locationId));
      if (selectedLocation?.id === locationId) {
        setSelectedLocation(locations[0] || null);
      }
      alert('Location deleted!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  // SECTION CRUD
  const createSection = async (e) => {
    e.preventDefault();
    if (!selectedLocation) {
      alert('Select a location first');
      return;
    }

    const sectionName = document.getElementById('section-name')?.value;
    const sectionDesc = document.getElementById('section-desc')?.value;
    
    if (!sectionName) {
      alert('Section name required');
      return;
    }

    try {
      setAppLoading(true);
      const { data, error } = await supabase
        .from('menu_sections')
        .insert([{
          location_id: selectedLocation.id,
          name: sectionName,
          description: sectionDesc,
          display_order: sections.length
        }])
        .select();
      
      if (error) throw error;
      setSections([...sections, data[0]]);
      document.getElementById('section-name').value = '';
      document.getElementById('section-desc').value = '';
      alert('Section created!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  const updateSection = async (sectionId, currentName, currentDesc) => {
    const newName = prompt('Edit section name:', currentName);
    if (!newName) return;

    try {
      setAppLoading(true);
      const { error } = await supabase
        .from('menu_sections')
        .update({ name: newName, description: currentDesc })
        .eq('id', sectionId);
      
      if (error) throw error;
      setSections(sections.map(s => s.id === sectionId ? { ...s, name: newName } : s));
      alert('Section updated!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  const deleteSection = async (sectionId) => {
    if (!window.confirm('Delete this section and all its dishes? This cannot be undone.')) return;

    try {
      setAppLoading(true);
      const { error } = await supabase
        .from('menu_sections')
        .delete()
        .eq('id', sectionId);
      
      if (error) throw error;
      setSections(sections.filter(s => s.id !== sectionId));
      await loadDishes(selectedLocation.id);
      alert('Section deleted!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  // DISH CRUD
  const startEditDish = (dish) => {
    setEditingDish(dish);
    setFormData({
      dishName: dish.name,
      sectionId: dish.section_id,
      description: dish.description_public || '',
      ingredients: dish.ingredients || '',
      prepNotes: dish.prep_notes || '',
      creationNotes: dish.creation_notes || '',
      environment: dish.environment,
      selectedAllergens: dish.dish_allergens?.map(da => da.allergens.id) || []
    });
    loadDishImages(dish.id);
  };

  const saveDish = async (e) => {
    e.preventDefault();
    if (!formData.sectionId) {
      alert('Select a section');
      return;
    }
    if (!formData.dishName) {
      alert('Dish name required');
      return;
    }

    try {
      setAppLoading(true);

      if (editingDish) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('dishes')
          .update({
            name: formData.dishName,
            section_id: formData.sectionId,
            description_public: formData.description,
            ingredients: formData.ingredients,
            prep_notes: formData.prepNotes,
            creation_notes: formData.creationNotes,
            environment: formData.environment
          })
          .eq('id', editingDish.id);
        
        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('dish_allergens')
          .delete()
          .eq('dish_id', editingDish.id);
        
        if (deleteError) throw deleteError;

        if (formData.selectedAllergens.length > 0) {
          const allergenRecords = formData.selectedAllergens.map(allergenId => ({
            dish_id: editingDish.id,
            allergen_id: allergenId
          }));

          const { error: insertError } = await supabase
            .from('dish_allergens')
            .insert(allergenRecords);
          
          if (insertError) throw insertError;
        }

        // Upload photos if any
        if (photoData.heroFile || photoData.processFiles.length > 0) {
          await uploadPhotos(editingDish.id);
        }

        alert('Dish updated!');
        setEditingDish(null);
      } else {
        // CREATE
        const { data: dishData, error: dishError } = await supabase
          .from('dishes')
          .insert([{
            section_id: formData.sectionId,
            environment: formData.environment,
            name: formData.dishName,
            description_public: formData.description,
            ingredients: formData.ingredients,
            prep_notes: formData.prepNotes,
            creation_notes: formData.creationNotes
          }])
          .select();
        
        if (dishError) throw dishError;
        
        const newDish = dishData[0];

        if (formData.selectedAllergens.length > 0) {
          const allergenRecords = formData.selectedAllergens.map(allergenId => ({
            dish_id: newDish.id,
            allergen_id: allergenId
          }));

          const { error: allergenError } = await supabase
            .from('dish_allergens')
            .insert(allergenRecords);
          
          if (allergenError) throw allergenError;
        }

        // Upload photos if any
        if (photoData.heroFile || photoData.processFiles.length > 0) {
          await uploadPhotos(newDish.id);
        }

        alert('Dish saved!');
      }

      await loadDishes(selectedLocation.id);
      
      setFormData({
        dishName: '',
        sectionId: '',
        description: '',
        ingredients: '',
        prepNotes: '',
        creationNotes: '',
        environment: 'dev',
        selectedAllergens: []
      });
      setPhotoData({
        heroImage: null,
        heroFile: null,
        processPhotos: [],
        processFiles: []
      });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  const deleteDish = async (dishId) => {
    if (!window.confirm('Delete this dish? This cannot be undone.')) return;

    try {
      setAppLoading(true);
      const { error } = await supabase
        .from('dishes')
        .delete()
        .eq('id', dishId);
      
      if (error) throw error;
      setDishes(dishes.filter(d => d.id !== dishId));
      alert('Dish deleted!');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAppLoading(false);
    }
  };

  const handleAllergenChange = (allergenId) => {
    setFormData(prev => ({
      ...prev,
      selectedAllergens: prev.selectedAllergens.includes(allergenId)
        ? prev.selectedAllergens.filter(id => id !== allergenId)
        : [...prev.selectedAllergens, allergenId]
    }));
  };

  const devDishCount = dishes.filter(d => d.environment === 'dev').length;
  const prodDishCount = dishes.filter(d => d.environment === 'production').length;

  if (loading) {
    return <div style={styles.container}><p>Loading...</p></div>;
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <div style={styles.authContainer}>
          <h1 style={styles.authTitle}>CB Lemons Menu Manager</h1>
          <p style={styles.authSubtitle}>Sign in to access</p>

          {authError && <div style={styles.authError}>{authError}</div>}

          <div style={styles.authCard}>
            <h2 style={styles.authCardTitle}>
              {showSignup ? 'Create Account' : 'Sign In'}
            </h2>

            <div style={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (showSignup ? handleSignup(e) : handleSignin(e))}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (showSignup ? handleSignup(e) : handleSignin(e))}
                style={styles.input}
              />
            </div>

            <button
              style={styles.buttonPrimary}
              onClick={showSignup ? handleSignup : handleSignin}
            >
              {showSignup ? 'Create Account' : 'Sign In'}
            </button>

            <p style={styles.authToggle}>
              {showSignup ? 'Already have an account? ' : 'Need an account? '}
              <button
                onClick={() => {
                  setShowSignup(!showSignup);
                  setAuthError('');
                }}
                style={styles.authLink}
              >
                {showSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>CB Lemons Menu Manager</h1>
          <p style={styles.subtitle}>Logged in as: {user.email}</p>
        </div>
        <button style={styles.signoutButton} onClick={handleSignout}>
          Sign Out
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tabs}>
        {['dashboard', 'locations', 'menus', 'dishes', 'allergens', 'preview'].map(tab => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(currentTab === tab ? styles.tabActive : {})
            }}
            onClick={() => setCurrentTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {currentTab === 'dashboard' && (
        <div style={styles.content}>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Locations</div>
              <div style={styles.statValue}>{locations.length}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Sections</div>
              <div style={styles.statValue}>{sections.length}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Dishes (Dev)</div>
              <div style={styles.statValue}>{devDishCount}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>In Production</div>
              <div style={styles.statValue}>{prodDishCount}</div>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'locations' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Manage Locations</h2>
            <div style={styles.locationPills}>
              {locations.map(loc => (
                <div key={loc.id} style={styles.locationItemContainer}>
                  <button
                    style={{
                      ...styles.locationPill,
                      ...(selectedLocation?.id === loc.id ? styles.locationPillActive : {})
                    }}
                    onClick={() => setSelectedLocation(loc)}
                  >
                    {loc.name}
                  </button>
                  <div style={styles.locationActions}>
                    <button
                      style={styles.editButton}
                      onClick={() => updateLocation(loc.id)}
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      style={styles.deleteButton}
                      onClick={() => deleteLocation(loc.id)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button style={styles.buttonPrimary} onClick={createLocation}>
              + Add Location
            </button>
          </div>
        </div>
      )}

      {currentTab === 'menus' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Menu Sections</h2>
            {selectedLocation ? (
              <>
                <p style={styles.selectedLocationText}>
                  <strong>Location:</strong> {selectedLocation.name}
                </p>
                <div style={styles.sectionsList}>
                  {sections.map(section => (
                    <div key={section.id} style={styles.cardWithActions}>
                      <div style={styles.card}>
                        <h3>{section.name}</h3>
                        <p>{section.description || 'No description'}</p>
                      </div>
                      <div style={styles.cardActions}>
                        <button
                          style={styles.editButton}
                          onClick={() => updateSection(section.id, section.name, section.description)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          style={styles.deleteButton}
                          onClick={() => deleteSection(section.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <h3 style={styles.sectionSubtitle}>Create New Section</h3>
                <div style={styles.formGroup}>
                  <label>Section Name</label>
                  <input
                    id="section-name"
                    type="text"
                    placeholder="e.g., Ineffable Salads"
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    id="section-desc"
                    placeholder="Brief description..."
                    style={styles.textarea}
                  />
                </div>
                <button style={styles.buttonPrimary} onClick={createSection}>
                  Create Section
                </button>
              </>
            ) : (
              <p>Select a location first</p>
            )}
          </div>
        </div>
      )}

      {currentTab === 'dishes' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>{editingDish ? 'Edit Dish' : 'Add Dish'}</h2>
            
            <div style={styles.formGroup}>
              <label>Dish Name</label>
              <input
                type="text"
                placeholder="e.g., Lemon Preservation Salad"
                value={formData.dishName}
                onChange={(e) => setFormData({ ...formData, dishName: e.target.value })}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Section</label>
              <select
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                style={styles.input}
              >
                <option value="">-- Select Section --</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label>Description</label>
              <textarea
                placeholder="What makes this special?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Ingredients</label>
              <textarea
                placeholder="Ingredient 1, Ingredient 2, ..."
                value={formData.ingredients}
                onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Allergens</label>
              <div style={styles.allergenList}>
                {allergens.map(allergen => (
                  <label key={allergen.id} style={styles.allergenCheckbox}>
                    <input
                      type="checkbox"
                      checked={formData.selectedAllergens.includes(allergen.id)}
                      onChange={() => handleAllergenChange(allergen.id)}
                    />
                    {allergen.name}
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label>Prep Notes (Dev Only)</label>
              <textarea
                placeholder="Internal preparation notes..."
                value={formData.prepNotes}
                onChange={(e) => setFormData({ ...formData, prepNotes: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Creation Notes (Dev Only)</label>
              <textarea
                placeholder="Inspiration, iteration history..."
                value={formData.creationNotes}
                onChange={(e) => setFormData({ ...formData, creationNotes: e.target.value })}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Environment</label>
              <select
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                style={styles.input}
              >
                <option value="dev">Development</option>
                <option value="test">Test</option>
                <option value="preprod">Pre-production</option>
                <option value="production">Production</option>
              </select>
            </div>

            <h3 style={styles.sectionSubtitle}>📸 Photos</h3>
            
            <div style={styles.formGroup}>
              <label>Hero Image (Main Dish Photo)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleHeroImageChange}
                style={styles.input}
              />
              {photoData.heroImage && (
                <div style={styles.photoPreview}>
                  <img src={photoData.heroImage} alt="Hero preview" style={styles.previewImg} />
                </div>
              )}
            </div>

            <div style={styles.formGroup}>
              <label>Process Photos (Step-by-Step)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleProcessPhotoChange}
                style={styles.input}
              />
              <div style={styles.processPhotosContainer}>
                {photoData.processPhotos.map((photo, idx) => (
                  <div key={idx} style={styles.processPhotoItem}>
                    <img src={photo.preview} alt={`Process step ${idx + 1}`} style={styles.previewImgSmall} />
                    <input
                      type="text"
                      placeholder={`Step ${idx + 1} caption...`}
                      value={photo.caption}
                      onChange={(e) => {
                        const updated = [...photoData.processPhotos];
                        updated[idx].caption = e.target.value;
                        setPhotoData({ ...photoData, processPhotos: updated });
                      }}
                      style={styles.input}
                    />
                    <button
                      type="button"
                      style={styles.deleteButton}
                      onClick={() => removeProcessPhoto(idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {editingDish && dishImages.length > 0 && (
              <div style={styles.formGroup}>
                <h4>Current Photos</h4>
                {dishImages.map((img) => (
                  <div key={img.id} style={styles.currentPhotoItem}>
                    <img src={img.image_url} alt={img.image_type} style={styles.currentPhotoImg} />
                    <div style={styles.currentPhotoInfo}>
                      <p>{img.image_type === 'hero' ? 'Hero Image' : `Process: ${img.caption}`}</p>
                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteImage(img.id, editingDish.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button style={styles.buttonPrimary} onClick={saveDish} disabled={appLoading}>
                {appLoading ? 'Saving...' : editingDish ? 'Update Dish' : 'Save Dish'}
              </button>
              {editingDish && (
                <button
                  style={styles.buttonSecondary}
                  onClick={() => {
                    setEditingDish(null);
                    setFormData({
                      dishName: '',
                      sectionId: '',
                      description: '',
                      ingredients: '',
                      prepNotes: '',
                      creationNotes: '',
                      environment: 'dev',
                      selectedAllergens: []
                    });
                    setPhotoData({
                      heroImage: null,
                      heroFile: null,
                      processPhotos: [],
                      processFiles: []
                    });
                    setDishImages([]);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Dishes</h2>
            {dishes.length === 0 ? (
              <p>No dishes yet</p>
            ) : (
              dishes.map(dish => (
                <div key={dish.id} style={styles.dishCardWithImages}>
                  <div style={styles.dishCardContent}>
                    <div style={styles.card}>
                      <h3>{dish.name}</h3>
                      <p>{dish.description_public || 'No description'}</p>
                      <div style={styles.dishMeta}>
                        <span style={styles.badge}>{dish.environment}</span>
                      </div>
                    </div>
                    <div style={styles.cardActions}>
                      <button
                        style={styles.editButton}
                        onClick={() => startEditDish(dish)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        style={styles.deleteButton}
                        onClick={() => deleteDish(dish.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {dish.dish_images && dish.dish_images.length > 0 && (
                    <div style={styles.dishImagesPreview}>
                      {dish.dish_images.filter(img => img.image_type === 'hero')[0] && (
                        <img
                          src={dish.dish_images.filter(img => img.image_type === 'hero')[0].image_url}
                          alt="Hero"
                          style={styles.dishImageThumbnail}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentTab === 'allergens' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Master Allergen List</h2>
            
            <div style={styles.allergenGrid}>
              {allergens.map(allergen => (
                <div key={allergen.id} style={styles.allergenCard}>
                  <div style={styles.allergenCardName}>{allergen.name}</div>
                  <div style={styles.allergenCardDesc}>{allergen.description}</div>
                </div>
              ))}
            </div>

            <h3 style={styles.sectionSubtitle}>Add New Allergen</h3>
            <div style={styles.formGroup}>
              <label>Allergen Name</label>
              <input
                id="allergen-name"
                type="text"
                placeholder="e.g., Sesame"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label>Description</label>
              <textarea
                id="allergen-desc"
                placeholder="Common uses..."
                style={styles.textarea}
              />
            </div>
            <button style={styles.buttonPrimary} onClick={async (e) => {
              e.preventDefault();
              const allergenName = document.getElementById('allergen-name')?.value;
              const allergenDesc = document.getElementById('allergen-desc')?.value;
              
              if (!allergenName) {
                alert('Allergen name required');
                return;
              }

              try {
                setAppLoading(true);
                const { data, error } = await supabase
                  .from('allergens')
                  .insert([{
                    name: allergenName,
                    description: allergenDesc
                  }])
                  .select();
                
                if (error) throw error;
                setAllergens([...allergens, data[0]]);
                document.getElementById('allergen-name').value = '';
                document.getElementById('allergen-desc').value = '';
                alert('Allergen added!');
              } catch (err) {
                alert('Error: ' + err.message);
              } finally {
                setAppLoading(false);
              }
            }} disabled={appLoading}>
              {appLoading ? 'Adding...' : 'Add Allergen'}
            </button>
          </div>
        </div>
      )}

      {currentTab === 'preview' && (
        <div style={styles.content}>
          <div style={styles.sectionBox}>
            <h2 style={styles.sectionTitle}>Public Menu Preview</h2>
            <p style={styles.previewDesc}>This is what customers see.</p>
            
            {selectedLocation && (
              <div style={styles.previewContainer}>
                <h1 style={styles.previewTitle}>{selectedLocation.name}</h1>
                
                {sections.map(section => (
                  <div key={section.id} style={styles.previewSection}>
                    <h2 style={styles.previewSectionTitle}>{section.name}</h2>
                    {dishes
                      .filter(d => d.section_id === section.id && d.environment === 'production')
                      .map(dish => (
                        <div key={dish.id} style={styles.previewDish}>
                          <h3>{dish.name}</h3>
                          {dish.dish_images && dish.dish_images.filter(img => img.image_type === 'hero')[0] && (
                            <img
                              src={dish.dish_images.filter(img => img.image_type === 'hero')[0].image_url}
                              alt={dish.name}
                              style={styles.previewDishImage}
                            />
                          )}
                          <p>{dish.description_public}</p>
                          {dish.dish_allergens && dish.dish_allergens.length > 0 && (
                            <div style={styles.previewAllergens}>
                              {dish.dish_allergens.map((da, idx) => (
                                <span key={idx} style={styles.previewAllergenTag}>
                                  ⚠️ {da.allergens.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f9f9f9',
    minHeight: '100vh'
  },
  authContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '1rem'
  },
  authTitle: {
    fontSize: '32px',
    fontWeight: '600',
    marginBottom: '0.5rem',
    textAlign: 'center'
  },
  authSubtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  authCard: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px'
  },
  authCardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '1.5rem',
    textAlign: 'center'
  },
  authError: {
    background: '#fee',
    color: '#c33',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '14px'
  },
  authToggle: {
    textAlign: 'center',
    marginTop: '1rem',
    fontSize: '14px',
    color: '#666'
  },
  authLink: {
    color: '#0066cc',
    textDecoration: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: '0',
    font: 'inherit'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #ddd'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    margin: '0 0 0.5rem'
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: '0'
  },
  signoutButton: {
    padding: '0.5rem 1rem',
    fontSize: '14px',
    background: '#c33',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  tabs: {
    display: 'flex',
    gap: '0',
    borderBottom: '1px solid #ddd',
    marginBottom: '2rem'
  },
  tab: {
    padding: '12px 16px',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    color: '#666',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s'
  },
  tabActive: {
    color: '#000',
    borderBottomColor: '#000'
  },
  content: {
    marginBottom: '2rem'
  },
  sectionBox: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '1.5rem'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },
  sectionSubtitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '1rem',
    marginTop: '2rem'
  },
  formGroup: {
    marginBottom: '1.5rem'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontFamily: 'inherit',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    boxSizing: 'border-box'
  },
  buttonPrimary: {
    padding: '0.75rem 1.5rem',
    fontSize: '14px',
    cursor: 'pointer',
    border: '1px solid #000',
    background: '#000',
    borderRadius: '4px',
    color: '#fff',
    transition: 'all 0.2s'
  },
  buttonSecondary: {
    padding: '0.75rem 1.5rem',
    fontSize: '14px',
    cursor: 'pointer',
    border: '1px solid #ddd',
    background: '#fff',
    borderRadius: '4px',
    color: '#000',
    transition: 'all 0.2s'
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem'
  },
  editButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0.5rem'
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0.5rem',
    color: '#c33'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem'
  },
  statCard: {
    background: '#f0f0f0',
    borderRadius: '8px',
    padding: '1rem',
    textAlign: 'center'
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '0.5rem'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600'
  },
  locationPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  locationItemContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  locationPill: {
    padding: '0.5rem 1rem',
    border: '1px solid #ddd',
    background: '#f9f9f9',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  locationPillActive: {
    background: '#000',
    color: '#fff',
    borderColor: '#000'
  },
  locationActions: {
    display: 'flex',
    gap: '0.25rem'
  },
  selectedLocationText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '1.5rem'
  },
  sectionsList: {
    marginBottom: '2rem'
  },
  cardWithActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1rem'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
    flexShrink: 0
  },
  card: {
    background: '#f9f9f9',
    border: '0.5px solid #ddd',
    borderRadius: '8px',
    padding: '1rem',
    flex: 1
  },
  dishCardWithImages: {
    background: '#f9f9f9',
    border: '0.5px solid #ddd',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
    display: 'flex',
    gap: '1rem'
  },
  dishCardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flex: 1,
    gap: '1rem'
  },
  dishImagesPreview: {
    flexShrink: 0,
    maxWidth: '150px'
  },
  dishImageThumbnail: {
    width: '150px',
    height: '150px',
    objectFit: 'cover',
    borderRadius: '4px'
  },
  photoPreview: {
    marginTop: '1rem',
    maxWidth: '200px'
  },
  previewImg: {
    width: '100%',
    borderRadius: '4px'
  },
  previewImgSmall: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '4px'
  },
  processPhotosContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginTop: '1rem'
  },
  processPhotoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: '120px'
  },
  currentPhotoItem: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    alignItems: 'center'
  },
  currentPhotoImg: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '4px'
  },
  currentPhotoInfo: {
    flex: 1
  },
  allergenList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  allergenCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '14px',
    cursor: 'pointer'
  },
  allergenGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  allergenCard: {
    background: '#f9f9f9',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid #ddd'
  },
  allergenCardName: {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '0.5rem'
  },
  allergenCardDesc: {
    fontSize: '12px',
    color: '#666'
  },
  dishMeta: {
    marginTop: '0.75rem',
    fontSize: '12px'
  },
  badge: {
    display: 'inline-block',
    background: '#e0e0e0',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '12px'
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  previewDesc: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '2rem'
  },
  previewContainer: {
    background: '#f9f9f9',
    padding: '2rem',
    borderRadius: '8px'
  },
  previewTitle: {
    fontSize: '28px',
    fontWeight: '600',
    margin: '0 0 2rem'
  },
  previewSection: {
    marginTop: '2rem',
    marginBottom: '2rem'
  },
  previewSectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '1.5rem'
  },
  previewDish: {
    background: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #ddd'
  },
  previewDishImage: {
    width: '100%',
    maxWidth: '400px',
    height: 'auto',
    borderRadius: '4px',
    marginBottom: '1rem'
  },
  previewAllergens: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.75rem'
  },
  previewAllergenTag: {
    background: '#fee',
    color: '#c33',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600'
  }
};
