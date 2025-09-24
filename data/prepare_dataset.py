# data/prepare_dataset.py
import os
import cv2
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
import torch
from torch.utils.data import Dataset, DataLoader
import torchvision.transforms as transforms
from pathlib import Path
import json

class DeepfakeDataset(Dataset):
    def __init__(self, data_dir, csv_file, transform=None, max_samples=None):
        self.data_dir = Path(data_dir)
        self.transform = transform
        
        # Load CSV with labels
        self.df = pd.read_csv(csv_file)
        if max_samples:
            self.df = self.df.sample(n=min(max_samples, len(self.df)))
        
        self.df = self.df.reset_index(drop=True)
        print(f"Dataset loaded: {len(self.df)} samples")
        
    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        
        # Load image
        img_path = self.data_dir / row['filename']
        image = cv2.imread(str(img_path))
        
        if image is None:
            # Return black image if file not found
            image = np.zeros((224, 224, 3), dtype=np.uint8)
        else:
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Apply transforms
        if self.transform:
            image = self.transform(image)
        
        # Get label
        label = float(row['label'])  # 0 = real, 1 = fake
        
        return image, torch.tensor(label, dtype=torch.float32)

def download_sample_data():
    """Download sample deepfake datasets"""
    print("📥 Downloading sample deepfake data...")
    
    # Create directories
    os.makedirs('data/real', exist_ok=True)
    os.makedirs('data/fake', exist_ok=True)
    
    # For demonstration, create sample data
    # In real implementation, you'd download actual datasets like:
    # - CelebDF
    # - DFDC (Deepfake Detection Challenge)
    # - FaceForensics++
    
    # Generate sample CSV
    sample_data = {
        'filename': [],
        'label': [],
        'source': []
    }
    
    # Add some sample entries
    for i in range(100):
        sample_data['filename'].append(f'real/sample_{i}.jpg')
        sample_data['label'].append(0)  # Real
        sample_data['source'].append('webcam')
    
    for i in range(100):
        sample_data['filename'].append(f'fake/deepfake_{i}.jpg')
        sample_data['label'].append(1)  # Fake
        sample_data['source'].append('generated')
    
    df = pd.DataFrame(sample_data)
    df.to_csv('data/dataset.csv', index=False)
    
    print("✅ Sample dataset structure created")
    print("💡 Replace with real deepfake dataset for training")
    
    return df

def create_data_loaders(data_dir='data', csv_file='data/dataset.csv', batch_size=32):
    """Create train/val/test data loaders"""
    
    # Data transforms
    train_transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(0.5),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                           std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                           std=[0.229, 0.224, 0.225])
    ])
    
    # Load dataset
    full_dataset = DeepfakeDataset(data_dir, csv_file, transform=None)
    
    # Split dataset
    train_size = int(0.7 * len(full_dataset))
    val_size = int(0.15 * len(full_dataset))
    test_size = len(full_dataset) - train_size - val_size
    
    train_indices = range(0, train_size)
    val_indices = range(train_size, train_size + val_size)
    test_indices = range(train_size + val_size, len(full_dataset))
    
    # Create datasets with transforms
    train_dataset = DeepfakeDataset(data_dir, csv_file, transform=train_transform)
    val_dataset = DeepfakeDataset(data_dir, csv_file, transform=val_transform)
    test_dataset = DeepfakeDataset(data_dir, csv_file, transform=val_transform)
    
    # Subset datasets
    train_dataset.df = train_dataset.df.iloc[train_indices].reset_index(drop=True)
    val_dataset.df = val_dataset.df.iloc[val_indices].reset_index(drop=True)
    test_dataset.df = test_dataset.df.iloc[test_indices].reset_index(drop=True)
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    print(f"📊 Data splits - Train: {len(train_dataset)}, Val: {len(val_dataset)}, Test: {len(test_dataset)}")
    
    return train_loader, val_loader, test_loader

if __name__ == "__main__":
    # Download and prepare data
    df = download_sample_data()
    
    # Create data loaders
    train_loader, val_loader, test_loader = create_data_loaders()
    
    print("✅ Dataset preparation complete!")