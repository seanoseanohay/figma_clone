/**
 * API Token Manager Component
 * Manages API tokens for external/AI access
 */

import { useState } from 'react';
import { useApiTokens } from '../../hooks/useApiTokens.js';
import { useCanvases } from '../../hooks/useCanvases.js';
import { toast } from 'react-toastify';
import { Key, Copy, Trash2, AlertCircle, Plus, Eye, EyeOff } from 'lucide-react';

export default function ApiTokenManager() {
  const { tokens, loading, generateToken, revokeToken, isTokenActive, isTokenExpired } = useApiTokens();
  const { canvases, loading: canvasesLoading } = useCanvases();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);

  if (loading || canvasesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">API Tokens</h1>
        <p className="text-gray-600">
          Generate and manage API tokens for external applications and AI agents.
        </p>
      </div>

      {/* Security Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-amber-900 mb-1">Security Best Practices</p>
          <ul className="text-amber-800 space-y-1">
            <li>• Tokens are shown only once during generation. Store them securely.</li>
            <li>• Never commit tokens to version control or share them publicly.</li>
            <li>• Revoke tokens immediately if they are compromised.</li>
            <li>• Use separate tokens for different applications or purposes.</li>
          </ul>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={() => setShowGenerateModal(true)}
        className="mb-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Generate New Token
      </button>

      {/* Tokens List */}
      <div className="space-y-4">
        {tokens.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No API Tokens</h3>
            <p className="text-gray-500 mb-4">Generate a token to get started with the API.</p>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Your First Token
            </button>
          </div>
        ) : (
          tokens.map(token => (
            <TokenCard
              key={token.id}
              token={token}
              isActive={isTokenActive(token)}
              isExpired={isTokenExpired(token)}
              onRevoke={revokeToken}
            />
          ))
        )}
      </div>

      {/* Generate Token Modal */}
      {showGenerateModal && (
        <GenerateTokenModal
          canvases={canvases}
          onClose={() => {
            setShowGenerateModal(false);
            setGeneratedToken(null);
          }}
          onGenerate={async (data) => {
            const result = await generateToken(
              data.canvasId,
              data.name,
              data.permissions,
              data.expiresInDays
            );
            setGeneratedToken(result);
          }}
          generatedToken={generatedToken}
        />
      )}
    </div>
  );
}

/**
 * Token Card Component
 */
function TokenCard({ token, isActive, isExpired, onRevoke }) {
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);

  const statusColor = isActive ? 'bg-green-100 text-green-800' : 
                     isExpired ? 'bg-amber-100 text-amber-800' :
                     'bg-gray-100 text-gray-800';

  const statusText = isActive ? 'Active' : 
                    isExpired ? 'Expired' : 
                    'Revoked';

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-lg">{token.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              {statusText}
            </span>
          </div>
          <p className="text-sm text-gray-600">Canvas: {token.canvasName}</p>
        </div>
        
        {isActive && !showConfirmRevoke && (
          <button
            onClick={() => setShowConfirmRevoke(true)}
            className="text-red-600 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
            title="Revoke token"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Confirm Revoke */}
      {showConfirmRevoke && (
        <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
          <p className="text-sm text-red-800 mb-2">
            Are you sure you want to revoke this token? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await onRevoke(token.id);
                setShowConfirmRevoke(false);
              }}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Revoke
            </button>
            <button
              onClick={() => setShowConfirmRevoke(false)}
              className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Token Details */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Created:</span>
          <span className="ml-2 text-gray-900">
            {token.createdAt ? new Date(token.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Expires:</span>
          <span className="ml-2 text-gray-900">
            {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString() : 'Never'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Last Used:</span>
          <span className="ml-2 text-gray-900">
            {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleDateString() : 'Never'}
          </span>
        </div>
        <div>
          <span className="text-gray-500">Usage Count:</span>
          <span className="ml-2 text-gray-900">{token.usageCount || 0}</span>
        </div>
      </div>

      {/* Permissions */}
      <div className="mt-3">
        <span className="text-gray-500 text-sm">Permissions:</span>
        <div className="flex flex-wrap gap-2 mt-1">
          {token.permissions?.map(perm => (
            <span key={perm} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
              {perm.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Generate Token Modal
 */
function GenerateTokenModal({ canvases, onClose, onGenerate, generatedToken }) {
  const [formData, setFormData] = useState({
    name: '',
    canvasId: '',
    permissions: ['read', 'create_objects', 'update_objects', 'delete_objects'],
    expiresInDays: 90
  });
  const [generating, setGenerating] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const handleGenerate = async () => {
    if (!formData.name || !formData.canvasId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setGenerating(true);
    try {
      await onGenerate(formData);
      setShowToken(true);
    } catch (error) {
      // Error handled in hook
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = () => {
    if (generatedToken?.token) {
      navigator.clipboard.writeText(generatedToken.token);
      toast.success('RAWR-some! Token copied to clipboard!');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {generatedToken ? 'Token Generated' : 'Generate API Token'}
          </h2>

          {!generatedToken ? (
            <>
              {/* Generate Form */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Token Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., AI Assistant Token"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Canvas <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.canvasId}
                    onChange={(e) => setFormData({ ...formData, canvasId: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a canvas...</option>
                    {canvases.map(canvas => (
                      <option key={canvas.id} value={canvas.id}>
                        {canvas.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {['read', 'create_objects', 'update_objects', 'delete_objects'].map(perm => (
                      <label key={perm} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes(perm)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                permissions: [...formData.permissions, perm]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                permissions: formData.permissions.filter(p => p !== perm)
                              });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{perm.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expires In (Days)
                  </label>
                  <select
                    value={formData.expiresInDays}
                    onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={generating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating || !formData.name || !formData.canvasId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating...' : 'Generate Token'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Token Display */}
              <div className="mb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Important: Save Your Token Now</p>
                    <p>This token will only be shown once. Copy it now and store it securely.</p>
                  </div>
                </div>

                <label className="block text-sm font-medium mb-2">Your API Token</label>
                <div className="relative">
                  <input
                    type={showToken ? "text" : "password"}
                    value={generatedToken.token}
                    readOnly
                    className="w-full px-3 py-2 pr-20 border rounded-lg font-mono text-sm bg-gray-50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      onClick={() => setShowToken(!showToken)}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title={showToken ? "Hide token" : "Show token"}
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyToken}
                      className="p-1.5 hover:bg-gray-200 rounded"
                      title="Copy token"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                  <p><strong>Name:</strong> {generatedToken.name}</p>
                  <p><strong>Canvas:</strong> {generatedToken.canvasName}</p>
                  <p><strong>Expires:</strong> {new Date(generatedToken.expiresAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Close */}
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

