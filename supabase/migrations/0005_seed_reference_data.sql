-- =============================================================================
-- GDIP Migration 0005 — Seed Reference Data
-- Seeds the four V1 markets, the standardized category taxonomy, and the seed
-- traveler personas. Amenity dictionary is seeded lightly; the pipeline grows it.
-- Idempotent via ON CONFLICT so it is safe to re-run.
-- =============================================================================

-- --- Markets -----------------------------------------------------------------
insert into markets (slug, name, region, center_lat, center_lng, search_terms) values
  ('lake-winnipesaukee','Lake Winnipesaukee','New Hampshire',43.6406,-71.3106,
     array['Lake Winnipesaukee vacation rental','Winnipesaukee lakefront home','Wolfeboro Meredith Gilford rental']),
  ('squam-lake','Squam Lake','New Hampshire',43.7690,-71.5440,
     array['Squam Lake vacation rental','Holderness NH lakefront','Squam Lake cottage']),
  ('newfound-lake','Newfound Lake','New Hampshire',43.6640,-71.7690,
     array['Newfound Lake vacation rental','Bristol NH lakefront home','Newfound Lake cottage']),
  ('lake-sunapee','Lake Sunapee','New Hampshire',43.3920,-72.0510,
     array['Lake Sunapee vacation rental','Sunapee lakefront home','New London NH rental'])
on conflict (slug) do nothing;

-- --- Categories (standardized review taxonomy) -------------------------------
-- Top-level categories from the spec. Sub-categories (Dock, Beach, etc.) can be
-- added with parent_id references; a few key children are seeded as examples.
insert into categories (slug, name) values
  ('amenities','Amenities'),
  ('guest_experience','Guest Experience'),
  ('host','Host'),
  ('communication','Communication'),
  ('cleanliness','Cleanliness'),
  ('design','Design'),
  ('outdoor_experience','Outdoor Experience'),
  ('location','Location'),
  ('restaurants','Restaurants'),
  ('activities','Activities'),
  ('events','Events'),
  ('maintenance','Maintenance'),
  ('parking','Parking'),
  ('technology','Technology'),
  ('value','Value'),
  ('family_experience','Family Experience'),
  ('luxury','Luxury'),
  ('accessibility','Accessibility'),
  ('pets','Pets')
on conflict (slug) do nothing;

-- Example sub-categories under Outdoor Experience.
insert into categories (slug, name, parent_id)
select v.slug, v.name, c.id
from (values
  ('dock','Dock'),
  ('lake_access','Lake Access'),
  ('beach','Beach'),
  ('fire_pit_area','Fire Pit Area')
) as v(slug, name)
cross join (select id from categories where slug = 'outdoor_experience') c
on conflict (slug) do nothing;

-- --- Traveler personas (seed set; emergent personas added by pipeline) -------
insert into traveler_personas (slug, name, is_seed, description) values
  ('families','Families',true,'Households traveling with children'),
  ('couples','Couples',true,'Two-adult leisure trips, romantic getaways'),
  ('wedding_guests','Wedding Guests',true,'Guests attending or hosting weddings'),
  ('luxury_travelers','Luxury Travelers',true,'High-end expectations, premium amenities'),
  ('pet_owners','Pet Owners',true,'Traveling with dogs/pets'),
  ('remote_workers','Remote Workers',true,'Working remotely during the stay'),
  ('business_travelers','Business Travelers',true,'Work-purpose trips'),
  ('fishing_groups','Fishing Groups',true,'Trips centered on fishing'),
  ('boating_groups','Boating Groups',true,'Trips centered on boating/watersports'),
  ('friends_trips','Friends Trips',true,'Groups of friends'),
  ('multigen_families','Multi-Generational Families',true,'Three+ generations traveling together'),
  ('seasonal_visitors','Seasonal Visitors',true,'Leaf-peeping, ski, summer-season visitors')
on conflict (slug) do nothing;

-- --- Amenities (light seed; expectation classification is data-driven) -------
insert into amenities (slug, name, category, classification) values
  ('fast_wifi','Fast Wi-Fi','technology','table_stakes'),
  ('smart_lock','Smart Lock','technology','table_stakes'),
  ('stocked_kitchen','Fully Stocked Kitchen','kitchen','table_stakes'),
  ('fire_pit','Fire Pit','outdoor','delight'),
  ('smores_kit','S''mores Kit','outdoor','delight'),
  ('paddleboards','Paddleboards','outdoor','delight'),
  ('local_gift','Local Welcome Gift','experience','delight'),
  ('dog_welcome_kit','Dog Welcome Kit','pets','delight'),
  ('curated_local_guide','Curated Local Guide','experience','delight'),
  ('private_dock','Private Dock','outdoor','unknown'),
  ('hot_tub','Hot Tub','outdoor','unknown')
on conflict (slug) do nothing;
