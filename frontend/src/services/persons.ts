import api from './api';
import {
  Person,
  PersonCreateRequest,
  PersonUpdateRequest,
  PersonListResponse
} from '@/types';

interface PersonStats {
  total_recognitions: number;
  successful_recognitions: number;
  last_recognition: string | null;
}

class PersonsService {
  async getPersons(
    page: number = 1,
    perPage: number = 20,
    search?: string
  ): Promise<PersonListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
    });

    if (search) {
      params.append('search', search);
    }

    const response = await api.get(`/persons?${params}`);
    return response.data;
  }

  async getPersonById(id: string): Promise<Person> {
    const response = await api.get(`/persons/${id}`);
    return response.data;
  }

  async createPerson(data: PersonCreateRequest): Promise<Person> {
    const response = await api.post('/persons', data);
    return response.data;
  }

  async updatePerson(id: string, data: PersonUpdateRequest): Promise<Person> {
    const response = await api.put(`/persons/${id}`, data);
    return response.data;
  }

  async deletePerson(id: string): Promise<void> {
    await api.delete(`/persons/${id}`);
  }

  async addPersonPhotos(id: string, photos: string[]): Promise<void> {
    const formData = new FormData();
    
    // Convert base64 images to blobs and add to FormData
    photos.forEach((photo, index) => {
      // Convert base64 to blob
      const byteCharacters = atob(photo.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      formData.append('photos', blob, `photo_${index}.jpg`);
    });

    await api.post(`/persons/${id}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deletePersonPhoto(personId: string, photoId: string): Promise<void> {
    await api.delete(`/persons/${personId}/photos/${photoId}`);
  }

  async getPersonPhotos(id: string): Promise<string[]> {
    const response = await api.get(`/persons/${id}/photos`);
    return response.data.photos || [];
  }

  async togglePersonStatus(personId: string, active: boolean): Promise<Person> {
    const updateData: PersonUpdateRequest & { active: boolean } = { active };
    return this.updatePerson(personId, updateData);
  }

  async getPersonStats(personId: string): Promise<PersonStats> {
    try {
      const response = await api.get(`/persons/${personId}/stats`);
      const logs = response.data.logs || [];
      
      return {
        total_recognitions: Array.isArray(logs) ? logs.length : 0,
        successful_recognitions: Array.isArray(logs) ? 
          logs.filter((log: any) => log?.status === 'success').length : 0,
        last_recognition: Array.isArray(logs) && logs.length > 0 ? 
          logs[0]?.created_at || null : null,
      };
    } catch (error) {
      console.error('Failed to get person stats:', error);
      return {
        total_recognitions: 0,
        successful_recognitions: 0,
        last_recognition: null,
      };
    }
  }

  async searchPersons(query: string): Promise<Person[]> {
    const response = await api.get(`/persons/search?q=${encodeURIComponent(query)}`);
    return response.data.persons || [];
  }
}

export const personsService = new PersonsService();