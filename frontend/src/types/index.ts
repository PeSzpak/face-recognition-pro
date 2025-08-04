export interface Person {
    id: string;
    name: string;
    photos: string[];
    createdAt: Date;
}

export interface RecognitionLog {
    id: string;
    personId: string;
    timestamp: Date;
    confidence: number;
}

export interface User {
    id: string;
    email: string;
    createdAt: Date;
}

export interface RecognitionResult {
    person: Person;
    confidence: number;
}