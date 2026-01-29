import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Constants } from '../app.constants';
import { LoadingService } from './loading.service';
import { DataService } from './data.service';
import { lastValueFrom } from 'rxjs';

/**
 * Service for managing entity relationships
 * Handles creating, retrieving, and deleting relationship items
 */
@Injectable({
  providedIn: 'root'
})
export class RelationshipService {
  constructor(
    private apiService: ApiService,
    private loadingService: LoadingService,
    private dataService: DataService,
  ) { }

  /*
   * Helper function to determine if schemas should be swapped
   * Ensures relationships are always created in a consistent order
   * 
   * @param schema1 - First entity schema
   * @param schema2 - Second entity schema
   * @return boolean - True if schemas should be swapped
   */
  private shouldSwapSchemas(schema1: string, schema2: string): boolean {
    // Define hierarchy levels, geozones are top of the charts! Products at the bottom.
    const hierarchy = { geozone: 0, facility: 1, activity: 2, product: 3 };
    const level1 = hierarchy[schema1];
    const level2 = hierarchy[schema2];

    // Swap if schema1 is lower in hierarchy (higher number) than schema2
    return level1 !== undefined && level2 !== undefined && level1 > level2;
  }

  /**
   * Create a relationship between two entities
   * 
   * @param pk1 - Full partition key of first entity (e.g., 'activity::bcparks_250')
   * @param sk1 - Sort key of first entity
   * @param pk2 - Full partition key of second entity (e.g., 'facility::bcparks_250')
   * @param sk2 - Sort key of second entity
   * @param metadata - Optional additional metadata
   */
  async createRelationship(pk1, sk1, pk2, sk2) {
    console.log('createRelationship');
    
    // Extract schemas from pks for hierarchy checking
    const schema1 = pk1.split('::')[0];
    const schema2 = pk2.split('::')[0];
    
    let props = { pk1, sk1, pk2, sk2 };

    // Swap if needed to maintain hierarchy (geozones > facilities > activities > products)
    // Refer to the very cool inverted triangle funnel diagram in the docs
    if (this.shouldSwapSchemas(schema1, schema2)) {
      props = {
        pk1: pk2,
        sk1: sk2,
        pk2: pk1,
        sk2: sk1
      };
    }

    const dataConst = schema1.toUpperCase() + '_RELATIONSHIP_RESULT';

    try {
      this.loadingService.addToFetchList(Constants.dataIds[dataConst]);
      const res = (await lastValueFrom(this.apiService.post(`relationships`, props)))['data'];
      this.dataService.setItemValue(Constants.dataIds[dataConst], res);
      this.loadingService.removeFromFetchList(Constants.dataIds[dataConst]);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds[dataConst]);
      console.log("Error creating relationship: ", error);
    }
    return null;
  }

  /**
   * Get all relationships for an entity (forward direction)
   * Returns all entities that the source entity is related to
   * 
   * @param pk1 - Full partition key of source entity (e.g., 'activity::bcparks_250')
   * @param sk1 - Sort key of source entity
   * @param targetSchema - Optional: filter by target schema
   * @param expand - Optional: if true, includes full entity data inline
   * @param bidirectional - Optional: if true, includes both forward and reverse relationships
   */
  async getRelationshipsFrom(pk1, sk1, targetSchema = undefined, expand = false, bidirectional = false) {
    const queryParams = {};
    if (targetSchema) {
      queryParams['targetSchema'] = targetSchema;
    }
    if (expand) {
      queryParams['expand'] = 'true';
    }
    if (bidirectional) {
      queryParams['bidirectional'] = 'true';
    }
    
    const schema1 = pk1.split('::')[0];
    const dataConst = schema1.toUpperCase() + '_RELATIONSHIP_RESULT';

    try {
      this.loadingService.addToFetchList(Constants.dataIds[dataConst]);
      const res = (await lastValueFrom(this.apiService.get(`relationships/${pk1}/${sk1}`, queryParams)))['data']?.items;
      this.dataService.setItemValue(Constants.dataIds[dataConst], res);
      this.loadingService.removeFromFetchList(Constants.dataIds[dataConst]);
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds[dataConst]);
      console.log("Error getting relationships (forever alone): ", error);
      return null;
    }
  }

  /**
   * Get all relationships to an entity (reverse direction via GSI)
   * Returns all entities that are related to the target entity
   * 
   * @param pk2 - Full partition key of target entity (e.g., 'facility::bcparks_250')
   * @param sk2 - Sort key of target entity
   * @param sourceSchema - Optional: filter by source schema
   */
  async getRelationshipsTo(pk2, sk2, sourceSchema) {
    let url = `relationships/reverse/${pk2}/${sk2}`;

    if (sourceSchema) {
      url += `?sourceSchema=${sourceSchema}`;
    }

    return await this.apiService.get(url);
  }

  /**
   * Delete a relationship between two entities
   * Creates a forward relationship from schema1 to schema2
   * 
   * @param schema1 - Schema of first ententity 1 to entity 2
   * 
   * @param pk1 - Full partition key of first entity (e.g., 'activity::bcparks_250')
   * @param sk1 - Sort key of first entity
   * @param pk2 - Full partition key of second entity (e.g., 'facility::bcparks_250')
   * @param sk2 - Sort key of second entity
   */
  async deleteRelationship(pk1, sk1, pk2, sk2) {
    // Extract schemas for hierarchy checking
    const schema1 = pk1.split('::')[0];
    const schema2 = pk2.split('::')[0];
    
    // Swap if needed to maintain hierarchy (geozones > facilities > activities > products)
    // Refer to the very cool inverted triangle funnel diagram in the docs
    if (this.shouldSwapSchemas(schema1, schema2)) {
      [pk1, pk2] = [pk2, pk1];
      [sk1, sk2] = [sk2, sk1];
    }

    const dataConst = schema1.toUpperCase() + '_RELATIONSHIP_RESULT';

    try {
      this.loadingService.addToFetchList(Constants.dataIds[dataConst]);
      const res = (await lastValueFrom(this.apiService.delete(`relationships/${pk1}/${sk1}/${pk2}/${sk2}`)))['data'];
      return res;
    } catch (error) {
      this.loadingService.removeFromFetchList(Constants.dataIds[dataConst]);

    }
  }

  /**
   * Sync relationships for an entity
   * Compares current vs desired relationships and creates/deletes as needed
   * 
   * @param sourceEntity - The source entity with pk, sk, schema
   * @param currentRelated - Current related entities
   * @param desiredRelated - Desired related entities
   */
  async syncRelationships(
    sourceEntity,
    currentRelated,
    desiredRelated
  ) {
    // Determine relationships to create
    const toCreate = desiredRelated.filter(
      desired => !currentRelated.some(
        current => current.pk === desired.pk && current.sk === desired.sk
      )
    );
    console.log('Relationships toCreate: ', toCreate);

    // Determine relationships to delete
    const toDelete = currentRelated.filter(
      current => !desiredRelated.some(
        desired => desired.pk === current.pk && desired.sk === current.sk
      )
    );
    console.log('Relationships toDelete: ', toDelete);

    // Create new relationships
    for (const entity of toCreate) {
      await this.createRelationship(
        sourceEntity.pk,
        sourceEntity.sk,
        entity.pk,
        entity.sk
      );
    }

    // Delete removed relationships
    for (const entity of toDelete) {
      await this.deleteRelationship(
        sourceEntity.pk,
        sourceEntity.sk,
        entity.pk,
        entity.sk,
      );
    }
  }
}
