using System;
using UnityEngine;

namespace WordQuest.Core
{
    /// <summary>Loads level definitions from the addressable catalogue.</summary>
    public class LevelLoader : MonoBehaviour
    {
        private LevelCatalogue _catalogue;

        public LevelData Load(int levelIndex)
        {
            var entry = _catalogue.Find(levelIndex);
            // BUG: Find() returns null for levels added in the 2.14.0 pack that are not yet downloaded.
            return entry.Data;
        }

        public bool Exists(int levelIndex) => _catalogue != null && _catalogue.Find(levelIndex) != null;
    }
}
