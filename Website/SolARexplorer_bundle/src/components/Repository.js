import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getRepositoryDetails, starRepository, unstarRepository, isRepositoryStarred } from '../utils/solanaUtils';
import { downloadRepository, getFileContent, listFiles } from '../utils/arweaveUtils';
import { useWallet } from '../contexts/WalletContext';

function Repository() {
    const { address } = useParams();
    const [copied, setCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);
    const [repository, setRepository] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedBranch, setSelectedBranch] = useState('main');
    const [isStarred, setIsStarred] = useState(false);
    const [starCount, setStarCount] = useState(0);
    const [starLoading, setStarLoading] = useState(false);
    
    // Get wallet context
    const { wallet, walletAddress, connectWallet } = useWallet();
    
    // Download state
    const [isDownloading, setIsDownloading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [downloadOption, setDownloadOption] = useState('full');
    const [downloadFormat, setDownloadFormat] = useState('zip');
    
    useEffect(() => {
        async function fetchRepositoryDetails() {
            try {
                setLoading(true);
                // For this example, we're using mock data, so let's ensure we have an address
                const repoId = address || "0x123...abc"; // Fallback to a default ID if address is undefined
                
                const repoData = await getRepositoryDetails(repoId, '');
                setRepository(repoData);
                setStarCount(repoData.stars || 0);
                
                // Set default selected branch to main or first available
                if (repoData.branches && repoData.branches.length > 0) {
                    const mainBranch = repoData.branches.find(b => b.name === 'main');
                    setSelectedBranch(mainBranch ? 'main' : repoData.branches[0].name);
                }
                
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch repository details:", error);
                setLoading(false);
            }
        }
        
        fetchRepositoryDetails();
    }, [address]);
    
    // Check if the repository is starred when wallet is connected
    useEffect(() => {
        async function checkStarStatus() {
            if (walletAddress && repository) {
                try {
                    const starred = await isRepositoryStarred(repository.owner, repository.name, walletAddress);
                    setIsStarred(starred);
                } catch (error) {
                    console.error("Failed to check star status:", error);
                }
            }
        }
        
        checkStarStatus();
    }, [walletAddress, repository]);
    
    const handleCopyAddress = () => {
        const addressToCopy = repository?.address || "0x123...abc";
        navigator.clipboard.writeText(addressToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const handleCopyUrl = () => {
        const addressToCopy = repository?.address || "0x123...abc";
        const repoUrl = `https://solar.com/repository/${addressToCopy}`;
        navigator.clipboard.writeText(repoUrl);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
    };
    
    // Handle starring/unstarring repository
    const handleToggleStar = async () => {
        if (!walletAddress) {
            const connected = await connectWallet();
            if (!connected) {
                alert("Failed to connect wallet. Please try again.");
                return;
            }
            return; // Exit and let the useEffect trigger the starred check
        }
        
        setStarLoading(true);
        try {
            if (isStarred) {
                await unstarRepository(repository.owner, repository.name, walletAddress);
                setIsStarred(false);
                setStarCount(prev => Math.max(0, prev - 1));
            } else {
                await starRepository(repository.owner, repository.name, walletAddress);
                setIsStarred(true);
                setStarCount(prev => prev + 1);
            }
        } catch (error) {
            console.error("Failed to toggle star:", error);
            alert(`Failed to ${isStarred ? 'unstar' : 'star'} repository. Please try again.`);
        } finally {
            setStarLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!showOptions) {
            setShowOptions(true);
            return;
        }
        
        try {
            setIsDownloading(true);
            setShowOptions(false);
            
            // Determine which branch to download
            const branchToDownload = downloadOption === 'full' ? 'all' : 
                                     downloadOption === 'main' ? 'main' : 
                                     downloadOption === 'selected' ? selectedBranch : 'main';
            
            const downloadResult = await downloadRepository(
                repository.owner || "0xabc...123",
                repository.name || "SolAR Repository",
                branchToDownload,
                downloadFormat
            );
            
            // Create download link
            const blob = new Blob([downloadResult.data], { type: 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            
            // Trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `${repository.name || "SolAR_Repository"}-${branchToDownload}.${downloadFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setIsDownloading(false);
        } catch (error) {
            console.error("Failed to download repository:", error);
            setIsDownloading(false);
            alert("Failed to download repository. Please try again later.");
        }
    };
    
    if (loading) {
        return <div className="loading-container">Loading repository details...</div>;
    }
    
    if (!repository) {
        return <div className="error-container">Repository not found or unable to load data.</div>;
    }
    
    return (
        <div className="repository-container">
            <div className="repository-header">
                <h1 className="centered">{repository.name}</h1>
                <div className="repository-meta">
                    <span className="repo-created">Created {new Date(repository.branches[0].date).toLocaleDateString()}</span>
                    <div className="repository-address-container">
                        <span className="address-label">Address:</span>
                        <code>{repository.address || "0x123...abc"}</code>
                        <button
                            className="copy-button"
                            onClick={() => handleCopyAddress()}
                            title={copied ? "Copied!" : "Copy address"}
                        >
                            {copied ? "✓" : "📋"}
                        </button>
                    </div>
                </div>
                
                <div className="repository-stats">
                    <div className="stat-item star-item" onClick={handleToggleStar}>
                        <span className="stat-icon">{isStarred ? "★" : "☆"}</span>
                        <span className="stat-value">{starCount} Stars</span>
                        {starLoading && <span className="star-loading">...</span>}
                    </div>
                    <div className="stat-item">
                        <span className="stat-icon">🔱</span>
                        <span className="stat-value">{repository.branches.length} Branches</span>
                    </div>
                </div>
                
                <div className="download-section">
                    <button 
                        className="download-button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                    >
                        {isDownloading ? "Downloading..." : showOptions ? "Start Download" : "Download Repository"}
                    </button>
                    
                    {showOptions && (
                        <div className="download-options">
                            <div className="option-group">
                                <label>What to download:</label>
                                <select 
                                    value={downloadOption} 
                                    onChange={(e) => setDownloadOption(e.target.value)}
                                >
                                    <option value="full">Entire Repository</option>
                                    <option value="main">Main Branch Only</option>
                                    <option value="selected">Selected Branch</option>
                                </select>
                            </div>
                            
                            {downloadOption === 'selected' && (
                                <div className="option-group">
                                    <label>Branch:</label>
                                    <select 
                                        value={selectedBranch} 
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                    >
                                        {repository.branches.map((branch, index) => (
                                            <option key={index} value={branch.name}>
                                                {branch.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            
                            <div className="option-group">
                                <label>Format:</label>
                                <select 
                                    value={downloadFormat} 
                                    onChange={(e) => setDownloadFormat(e.target.value)}
                                >
                                    <option value="zip">ZIP Archive</option>
                                    <option value="tar">TAR Archive</option>
                                    <option value="source">Source Files</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="repository-content">
                <div className="section-container">
                    <h2 className="section-title">Members</h2>
                    <div className="member-list">
                        <div className="member owner">
                            <span className="member-type">Owner</span>
                            <span className="member-wallet">{repository.owner}</span>
                        </div>
                        {repository.collaborators && repository.collaborators.map((collab, index) => (
                            <div className="member" key={index}>
                                <span className="member-type">Collaborator</span>
                                <span className="member-wallet">{collab.address}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section-container">
                    <h2 className="section-title">Branches</h2>
                    <div className="branch-list">
                        {repository.branches.map((branch, index) => (
                            <div 
                                className={`branch ${branch.name === 'main' ? 'main-branch' : ''}`} 
                                key={index}
                                onClick={() => setSelectedBranch(branch.name)}
                            >
                                <span className="branch-name">{branch.name}</span>
                                <span className="branch-commit">Commit: {branch.commit_hash.substring(0, 8)}</span>
                                <span className="branch-date">Updated: {new Date(branch.date).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="section-container">
                    <h2 className="section-title">Clone Repo</h2>
                    <div className="repo-url-container">
                        <code>{`https://solar.com/repository/${repository.address || "0x123...abc"}`}</code>
                        <button
                            className="copy-button"
                            onClick={handleCopyUrl}
                            title={urlCopied ? "Copied!" : "Copy repository URL"}
                        >
                            {urlCopied ? "✓" : "📋"}
                        </button>
                    </div>
                    
                    <div className="clone-instructions">
                        <h3>Clone with CLI</h3>
                        <pre className="code-block">
                            <code>solar clone {repository.address || "0x123...abc"}</code>
                        </pre>
                        
                        <h3>Using Web3 Wallet</h3>
                        <p>Connect your Web3 wallet and clone directly through your browser.</p>
                        <button 
                            className="connect-wallet-btn"
                            onClick={walletAddress ? null : connectWallet}
                        >
                            {walletAddress ? `Connected: ${walletAddress}` : "Connect Wallet"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Repository;