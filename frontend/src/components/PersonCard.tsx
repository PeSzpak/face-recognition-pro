import React from 'react';

interface PersonCardProps {
    name: string;
    photos: string[];
    onEdit: () => void;
    onDelete: () => void;
}

const PersonCard: React.FC<PersonCardProps> = ({ name, photos, onEdit, onDelete }) => {
    return (
        <div className="person-card">
            <h3>{name}</h3>
            <div className="photo-gallery">
                {photos.map((photo, index) => (
                    <img key={index} src={photo} alt={`${name} ${index}`} className="person-photo" />
                ))}
            </div>
            <div className="actions">
                <button onClick={onEdit} className="edit-button">Edit</button>
                <button onClick={onDelete} className="delete-button">Delete</button>
            </div>
        </div>
    );
};

export default PersonCard;