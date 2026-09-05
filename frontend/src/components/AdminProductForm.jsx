import { useState } from 'react';
import { addProduct, updateProduct, deleteProduct, productImage } from '../api';
import { useLanguage } from '../context/LanguageContext';

const emptyForm = { name: '', price: '', buying_price: '', category: '', description: '', stock: '' };
const QUICK_CATEGORIES = ['Skincare', 'Fragrance', 'Haircare', 'Bath & Body', 'Wellness'];

export default function AdminProductForm({ products, categories, onChange }) {
  const { t, dict, lang } = useLanguage();
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState({ state: 'idle', message: '' });

  function startEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      price: product.price,
      buying_price: product.buying_price || '',
      category: product.category,
      description: product.description || '',
      stock: product.stock,
    });
    setImageFile(null);
    setImagePreview(productImage(product));
    setStatus({ state: 'idle', message: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview(null);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    setImageFile(file || null);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus({ state: 'loading', message: '' });
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('price', form.price);
      fd.append('buying_price', form.buying_price || 0);
      fd.append('category', form.category);
      fd.append('description', form.description);
      fd.append('stock', form.stock || 0);
      if (imageFile) fd.append('image', imageFile);

      if (editingId) {
        await updateProduct(editingId, fd);
        setStatus({
          state: 'success',
          message: lang === 'fr' ? 'Produit mis à jour avec succès.' : 'Product updated successfully.',
        });
      } else {
        await addProduct(fd);
        setStatus({
          state: 'success',
          message: lang === 'fr' ? 'Produit ajouté au catalogue.' : 'Product added to catalog.',
        });
      }
      resetForm();
      onChange();
    } catch (err) {
      const msg = err?.response?.data?.error || (lang === 'fr' ? 'Une erreur est survenue.' : 'Something went wrong.');
      setStatus({ state: 'error', message: msg });
    }
  }

  async function handleDelete(id) {
    const confirmMsg = lang === 'fr'
      ? 'Supprimer ce produit ? Cette action est irréversible.'
      : 'Delete this product? This cannot be undone.';
    if (!window.confirm(confirmMsg)) return;
    await deleteProduct(id);
    onChange();
  }

  return (
    <div>
      <form className="admin-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {editingId
              ? (lang === 'fr' ? 'Modifier le Produit' : 'Edit Product')
              : (lang === 'fr' ? 'Ajouter un Nouveau Produit' : 'Add New Product')}
          </h3>
          {editingId && (
            <button type="button" className="clear-btn" onClick={resetForm}>
              {lang === 'fr' ? 'Annuler la modification' : 'Cancel Editing'}
            </button>
          )}
        </div>

        <div className="admin-form-grid">
          <div className="form-group full">
            <label>{lang === 'fr' ? 'Nom du Produit (ex: Sérum Éclat Hydra)' : 'Product Name (e.g. Hydra Glow Face Serum)'}</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Luxe Rose Eau de Parfum"
            />
          </div>

          <div className="form-group">
            <label>{lang === 'fr' ? 'Prix de Vente en DZD' : 'Selling Price in DZD'}</label>
            <input
              type="number"
              min="0"
              step="1"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="e.g. 3500"
            />
          </div>

          <div className="form-group">
            <label>{lang === 'fr' ? 'Prix d’Achat (Coût) en DZD' : 'Buying (Cost) Price in DZD'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.buying_price}
              onChange={(e) => setForm({ ...form, buying_price: e.target.value })}
              placeholder="e.g. 1800"
            />
            <span style={{ fontSize: '11px', color: '#71717a' }}>
              {lang === 'fr'
                ? 'Utilisé pour les rapports de marge — jamais affiché aux clients.'
                : 'Used for profit reporting only — never shown to customers.'}
            </span>
          </div>

          <div className="form-group">
            <label>{lang === 'fr' ? 'Quantité en Stock (Unités)' : 'Stock Quantity (Units)'}</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              placeholder="e.g. 25"
            />
          </div>

          <div className="form-group full">
            <label>{lang === 'fr' ? 'Catégorie / Rayon' : 'Category / Department'}</label>
            <input
              required
              list="category-suggestions"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="e.g. Skincare, Fragrance, Haircare, Bath & Body"
            />
            <datalist id="category-suggestions">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {/* Quick Category Buttons */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
              {QUICK_CATEGORIES.map((qc) => {
                const label = dict?.home?.departments?.categories?.[qc] || qc;
                return (
                  <button
                    key={qc}
                    type="button"
                    onClick={() => setForm({ ...form, category: qc })}
                    style={{
                      fontSize: '10.5px',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      background: form.category === qc ? '#000' : '#f4f4f5',
                      color: form.category === qc ? '#fff' : '#000',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                    }}
                  >
                    + {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group full">
            <label>{lang === 'fr' ? 'Description & Bienfaits' : 'Description & Benefits'}</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={lang === 'fr' ? 'Décrivez les actifs, bienfaits et conseils d’utilisation...' : 'Describe formulation benefits, active ingredients, instructions...'}
            />
          </div>

          <div className="form-group full">
            <label>
              {lang === 'fr'
                ? `Image du Produit ${editingId ? '(laisser vide pour conserver l’image actuelle)' : ''}`
                : `Product Image ${editingId ? '(leave empty to keep current image)' : ''}`}
            </label>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            {imagePreview && (
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e5e5e7' }}
                />
                <span style={{ fontSize: '11.5px', color: '#71717a' }}>{lang === 'fr' ? 'Aperçu de l’image' : 'Image Preview'}</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button type="submit" className="btn btn-green" disabled={status.state === 'loading'}>
            {status.state === 'loading'
              ? (lang === 'fr' ? 'Enregistrement...' : 'Saving...')
              : editingId
                ? (lang === 'fr' ? 'Mettre à jour le Produit' : 'Update Product')
                : (lang === 'fr' ? 'Ajouter au Catalogue' : 'Add to Catalog')}
          </button>
          {editingId && (
            <button type="button" className="btn btn-outline-dark" onClick={resetForm}>
              {lang === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
          )}
        </div>

        {status.message && (
          <p className={`form-msg ${status.state === 'success' ? 'success' : 'error'}`}>
            {status.message}
          </p>
        )}
      </form>

      {/* Catalog Table */}
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>{lang === 'fr' ? 'Photo' : 'Photo'}</th>
              <th>{lang === 'fr' ? 'Nom du Produit' : 'Product Name'}</th>
              <th>{lang === 'fr' ? 'Catégorie' : 'Category'}</th>
              <th>{lang === 'fr' ? 'Prix' : 'Price'}</th>
              <th>{lang === 'fr' ? 'Coût / Marge' : 'Cost / Margin'}</th>
              <th>{lang === 'fr' ? 'Stock' : 'Stock'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'fr' ? 'Actions' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const img = productImage(p);
              const cost = p.buying_price || 0;
              const margin = (p.price || 0) - cost;
              const catName = dict?.home?.departments?.categories?.[p.category] || p.category;
              return (
                <tr key={p.id}>
                  <td>
                    {img ? (
                      <img
                        src={img}
                        alt={p.name}
                        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, background: '#f6f6f6', borderRadius: '4px' }} />
                    )}
                  </td>
                  <td style={{ fontWeight: '700' }}>{p.name}</td>
                  <td>
                    <span className="badge">{catName}</span>
                  </td>
                  <td style={{ fontWeight: '700' }}>{Number(p.price).toLocaleString('en-US')} DZD</td>
                  <td style={{ fontSize: '12px' }}>
                    {cost > 0 ? (
                      <>
                        <div style={{ color: '#71717a' }}>{lang === 'fr' ? 'Coût :' : 'Cost:'} {cost.toLocaleString('en-US')} DZD</div>
                        <div style={{ fontWeight: '700', color: margin >= 0 ? '#15803d' : '#b91c1c' }}>
                          {lang === 'fr' ? 'Marge :' : 'Margin:'} {margin.toLocaleString('en-US')} DZD
                        </div>
                      </>
                    ) : (
                      <span style={{ color: '#b45309' }}>{lang === 'fr' ? 'Aucun coût défini' : 'No cost set'}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ color: p.stock > 0 ? '#15803d' : '#b91c1c', fontWeight: '700' }}>
                      {p.stock > 0
                        ? (lang === 'fr' ? `${p.stock} en stock` : `${p.stock} in stock`)
                        : (lang === 'fr' ? 'Rupture de stock' : 'Out of stock')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="icon-btn" onClick={() => startEdit(p)}>
                      {lang === 'fr' ? 'Modifier' : 'Edit'}
                    </button>
                    <button className="icon-btn danger" onClick={() => handleDelete(p.id)}>
                      {lang === 'fr' ? 'Supprimer' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="empty-state">
            {lang === 'fr' ? 'Aucun produit dans le catalogue.' : 'No products in catalog yet.'}
          </div>
        )}
      </div>
    </div>
  );
}

